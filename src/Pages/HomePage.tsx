import { invoke } from "@tauri-apps/api";
import { useEffect, useState } from "react"
import NavbarComponent from "../components/NavbarComponent";
import { useNavigate } from "react-router-dom";


export default function HomePage() {
    // const [users, setUsers] = useState<User[]>([]);
    const [currentUser, setCurrentUser] = useState<User>()
    const [listOfTransactions, setListOfTransactions] = useState<TransactionForStudent[]>([])
    const [examTransaction, setExamTransaction] = useState<TransactionForStudent | null>(null);
    const [listOfJobs, setListOfJob] = useState<TransactionForOtherRole[]>([])
    const [option, setSelectedOption] = useState<string>("Unfinished")
    const [answer, setanswer] = useState<File | null>(null)
    const [errorMsg, setErrorMsg] = useState('')

    const [popUp, showPopUp] = useState(false)
    const [isFinal, setFinal] = useState(false)

    const handleOptionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedOption(event.target.value);
    };

    useEffect(() => {
        invoke('get_current_user').then((user) => {
            setCurrentUser(user as User)
        })
    }, [])

    const downloadCase = () => {


        invoke('get_transaction_case', { transactionId: examTransaction?.transaction_id }).then((result) => {
            const byteArray = new Uint8Array(Number(result));
            const blob = new Blob([byteArray], { type: 'application/zip' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'exam_case.zip';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        })


    };



    const downloadAnswer = () => {


        invoke('get_student_answer', { transactionId: examTransaction?.transaction_id, studentNim: currentUser?.nim }).then((result) => {
            const byteArray = new Uint8Array(Number(result));
            const blob = new Blob([byteArray], { type: 'application/zip' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'answer_case.zip';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        })


    };

    useEffect(() => {
        if (currentUser) {
            if (currentUser.role === "Student") {
                invoke('get_student_transaction_by_nim', { nimCode: currentUser.nim }).then((transactions) => {
                    if (transactions) {
                        setListOfTransactions(transactions as TransactionForStudent[])

                        const now = new Date();
                        const examTransaction = listOfTransactions.find((transaction) => {
                            const transactionStartDate = new Date(transaction.transaction_date + ' ' + transaction.transaction_start);
                            const transactionEndDate = new Date(transaction.transaction_date + ' ' + transaction.transaction_end);
                            return now >= transactionStartDate && now <= transactionEndDate;
                        });

                        setExamTransaction(examTransaction || null);
                        if (examTransaction !== null) {
                            invoke('is_finalize', { studentNim: currentUser?.nim, transactionId: examTransaction?.transaction_id }).then((found) => {
                                if (found) {
                                    setFinal(true)
                                } else {
                                    setFinal(false)
                                }
                            }).catch((error) => {
                                setFinal(false)
                            })
                        }
                    }
                })
            } else {

                invoke('get_assistant_transaction_by_initial', { initialCode: currentUser.initial }).then((transactions) => {
                    setListOfJob(transactions as TransactionForOtherRole[])
                })
            }

        }
    })

    const isTransactionExpired = (transaction: TransactionForOtherRole) => {

        return transaction.status === 1
    };

    const renderTransactionRow = (transaction: TransactionForOtherRole) => {
        const rowClassName = isTransactionExpired(transaction) ? "bg-green-500 hover:bg-green-600" : "bg-red-700 hover:bg-red-600";
        if (!isTransactionExpired(transaction)) {
            return (
                <tr key={transaction.transaction_id} className={`border-b border-gray-200 ${rowClassName}`} onClick={() => rowClick(transaction)}>
                    <td className="py-2 px-6 text-left text-black font-bold whitespace-nowrap border">{transaction.room_number}</td>
                    <td className="py-2 px-6 text-left text-black font-bold whitespace-nowrap border">{transaction.subject_code}</td>
                    <td className="py-2 px-6 text-left text-black font-bold whitespace-nowrap border">{transaction.subject_name}</td>
                    <td className="py-2 px-6 text-left text-black font-bold border">{transaction.transaction_date}</td>
                    <td className="py-2 px-6 text-left text-black font-bold border">{`${transaction.transaction_start} - ${transaction.transaction_end}`}</td>
                </tr>
            )
        }

    };

    const renderTransactionRow2 = (transaction: TransactionForOtherRole) => {
        const rowClassName = isTransactionExpired(transaction) ? "bg-green-500 hover:bg-green-600" : "bg-red-700 hover:bg-red-600";
        if (isTransactionExpired(transaction)) {
            return (
                <tr key={transaction.transaction_id} className={`border-b border-gray-200 ${rowClassName}`} onClick={() => rowClick(transaction)}>
                    <td className="py-2 px-6 text-left text-black font-bold whitespace-nowrap border">{transaction.room_number}</td>
                    <td className="py-2 px-6 text-left text-black font-bold whitespace-nowrap border">{transaction.subject_code}</td>
                    <td className="py-2 px-6 text-left text-black font-bold whitespace-nowrap border">{transaction.subject_name}</td>
                    <td className="py-2 px-6 text-left text-black font-bold border">{transaction.transaction_date}</td>
                    <td className="py-2 px-6 text-left text-black font-bold border">{`${transaction.transaction_start} - ${transaction.transaction_end}`}</td>
                </tr>
            )
        }

    };

    const navigate = useNavigate();

    const rowClick = (t: TransactionForOtherRole) => {
        navigate(`/Transaction/Detail/${t.transaction_id}`);
    }

    const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {

        if (event.target.files) {
            setanswer(event.target.files[0]); // Setting the selected file in the component state
        }

    };

    const uploadBtnClick = async () => {
        if (!answer) return;

        if (!answer || !answer.name.endsWith('.zip')) {
            // File is missing or not a .zip file
            setErrorMsg('File must be .zip');
            return;
        }

        const reader = new FileReader();
        reader.onload = async () => {
            const fileData = new Uint8Array(reader.result as ArrayBuffer);
            invoke('upload_answer', {
                file: Array.from(fileData),
                studentNim: currentUser?.nim,
                transactionId: examTransaction?.transaction_id,
            }).catch((error) => {
                setErrorMsg('error')
            }).then((result) => {
                setErrorMsg("File Success Uploaded")
            });

        };
        reader.readAsArrayBuffer(answer);
    };

    const finalizeBtn = () => {
        showPopUp(true)
        setErrorMsg('')
    }

    const CancelBtn = () => {
        showPopUp(false)
        setErrorMsg('')
    }

    const finalize = () => {
        invoke('finalize', {
            studentNim: currentUser?.nim,
            transactionId: examTransaction?.transaction_id,
        }).then((suc) => {
            if (suc) {
                window.location.reload()
            }
        })
    }

    return (
        <div>
            <NavbarComponent />
            {currentUser?.role === "Student" && (
                <>
                    {popUp === true && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-500 bg-opacity-75">
                            <div className="bg-white w-1/3 pt-8 rounded-lg shadow-lg flex flex-col">
                                <div className=" px-8 pt-6 pb-8 mb-4">
                                    <h2 className="text-xl font-semibold mb-4">Are you sure you want to finalize?</h2>



                                    <button className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 mr-11 px-4 rounded focus:outline-none focus:shadow-outline" onClick={CancelBtn}>Cancel</button>
                                    <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline" onClick={finalize}>Submit</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {examTransaction !== null && (
                        <div className="bg-gray-700 h-screen w-screen">
                            <div className="flex flex-col p-11">
                                <h1 className="text-red-500 underline text-bold" style={{ fontSize: "30px" }}>Exam Transaction</h1>
                                <table className="min-w-full bg-white shadow-md rounded-lg mb-4 mt-11">
                                    <thead className="sticky top-0 bg-gray-800 text-white">
                                        <tr>
                                            <th className="py-3 px-6 text-left border">Room</th>
                                            <th className="py-3 px-6 text-left border">Subject Code</th>
                                            <th className="py-3 px-6 text-left border">Subject Name</th>
                                            <th className="py-3 px-6 text-left border">Transaction Date</th>
                                            <th className="py-3 px-6 text-left border">Transaction Time</th>

                                            <th className="py-3 px-6 text-left border">Seat Number</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-gray-600 text-sm font-light">

                                        <tr className="border-b border-gray-200 hover:bg-gray-100">
                                            <td className="py-2 px-6 text-left whitespace-nowrap border">
                                                {examTransaction.room_number}
                                            </td>
                                            <td className="py-2 px-6 text-left whitespace-nowrap border">
                                                {examTransaction.subject_code}
                                            </td>
                                            <td className="py-2 px-6 text-left whitespace-nowrap border">
                                                {examTransaction.subject_name}
                                            </td>
                                            <td className="py-2 px-6 text-left border">
                                                {examTransaction.transaction_date}
                                            </td>
                                            <td className="py-2 px-6 text-left border">
                                                {examTransaction.transaction_start} - {examTransaction.transaction_end}
                                            </td>

                                            <td className="py-2 px-6 text-left border">
                                                {examTransaction.seat_number}
                                            </td>
                                        </tr>

                                    </tbody>
                                </table>

                                <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-5" onClick={downloadCase}>
                                    Download Case
                                </button>
                                <div className="flex gap-11 items-center">
                                    {isFinal === false && (
                                        <div>
                                            <input type="file" className="border-2 font-bold" onChange={handleFileInput} />
                                            <button className="ml-11 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" onClick={uploadBtnClick}>
                                                Upload Answer
                                            </button>
                                        </div>

                                    )}

                                    <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" onClick={downloadAnswer}>
                                        Download Answer
                                    </button>
                                    <p className="text-red-500 ml-11 text-lg font-bold">{errorMsg}</p>
                                </div>
                                {isFinal === false && (
                                    <>
                                        <button className="mt-11 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-5" onClick={finalizeBtn}>
                                            Finalize
                                        </button>
                                    </>
                                )}

                            </div>
                        </div>
                    )}

                    {examTransaction === null && (

                        <div className="bg-blue-900 w-screen h-screen">

                            <div className="p-20">
                                {listOfTransactions.length > 0 && (
                                    <table className="min-w-full bg-white shadow-md rounded-lg mb-4">
                                        <thead className="sticky top-0 bg-gray-800 text-white">
                                            <tr>
                                                <th className="py-3 px-6 text-left border">Room</th>
                                                <th className="py-3 px-6 text-left border">Subject Code</th>
                                                <th className="py-3 px-6 text-left border">Subject Name</th>
                                                <th className="py-3 px-6 text-left border">Transaction Date</th>
                                                <th className="py-3 px-6 text-left border">Transaction Time</th>

                                                <th className="py-3 px-6 text-left border">Seat Number</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-gray-600 text-sm font-light">

                                            {listOfTransactions.map((transaction) => (
                                                <tr className="border-b border-gray-200 hover:bg-gray-100">
                                                    <td className="py-2 px-6 text-left whitespace-nowrap border">
                                                        {transaction.room_number}
                                                    </td>
                                                    <td className="py-2 px-6 text-left whitespace-nowrap border">
                                                        {transaction.subject_code}
                                                    </td>
                                                    <td className="py-2 px-6 text-left whitespace-nowrap border">
                                                        {transaction.subject_name}
                                                    </td>
                                                    <td className="py-2 px-6 text-left border">
                                                        {transaction.transaction_date}
                                                    </td>
                                                    <td className="py-2 px-6 text-left border">
                                                        {transaction.transaction_start} - {transaction.transaction_end}
                                                    </td>

                                                    <td className="py-2 px-6 text-left border">
                                                        {transaction.seat_number}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                                {listOfTransactions.length === 0 && (
                                    <h1 className="text-red-500 font-bold mt-20" style={{ fontSize: '30px' }}>There is no available transactions!</h1>
                                )}
                            </div>
                        </div>
                    )}


                </>
            )}
            {currentUser?.role !== "Student" && (
                <div className="bg-blue-900 w-screen h-screen p-11">
                    <div className="px-20 flex flex-row gap-10">
                        <label className="text-white">
                            <input
                                type="radio"
                                value="Unfinished"
                                checked={option === 'Unfinished'}
                                onChange={handleOptionChange}
                            />
                            Unfinished
                        </label>
                        <label className="text-white">
                            <input
                                type="radio"
                                value="Finished"
                                checked={option === 'Finished'}
                                onChange={handleOptionChange}
                            />
                            Finished
                        </label>

                    </div>
                    <div className="p-20">
                        {listOfJobs.length > 0 && (
                            <table className="min-w-full bg-white shadow-md rounded-lg mb-4">
                                <thead className="sticky top-0 bg-gray-800 text-white">
                                    <tr>
                                        <th className="py-3 px-6 text-left border">Room</th>
                                        <th className="py-3 px-6 text-left border">Subject Code</th>
                                        <th className="py-3 px-6 text-left border">Subject Name</th>
                                        <th className="py-3 px-6 text-left border">Transaction Date</th>
                                        <th className="py-3 px-6 text-left border">Transaction Time</th>


                                    </tr>
                                </thead>
                                <tbody className="text-gray-600 text-sm font-light">

                                    {option === "Unfinished" && listOfJobs.map((transaction) => (
                                        renderTransactionRow(transaction)
                                    ))}
                                    {option === "Finished" && listOfJobs.map((transaction) => (
                                        renderTransactionRow2(transaction)
                                    ))}
                                </tbody>
                            </table>
                        )}
                        {option === "Unfinished" && listOfJobs.length === 0 && (
                            <h1 className="text-red-500 font-bold mt-20" style={{ fontSize: '30px' }}>No unfinished proctoring schedule!</h1>
                        )}
                        {option === "Finished" && listOfJobs.length === 0 && (
                            <h1 className="text-red-500 font-bold mt-20" style={{ fontSize: '30px' }}>No finished proctoring schedule!</h1>
                        )}
                    </div>
                </div>
            )}
        </div>
    )




}

