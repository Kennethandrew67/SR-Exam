import { useNavigate } from "react-router-dom";
import NavbarComponent from "../components/NavbarComponent";
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api";

export default function ExamSchedulerPage() {
    const navigate = useNavigate();
    const [transactionList, setTransactionList] = useState<TransactionForAssistant[]>([])
    const [selectedTransactions, setSelectedTransactions] = useState<number[]>([])
    const [allAssitant, setAllAssistant] = useState<User[]>([])
    const [currentAssitant, setcurrentAssistant] = useState<User[]>([])
    const [generationFilter, setGenerationFilter] = useState('')
    const [errorMsg, setError] = useState('')
    const [selectedAssistant, setSelectedAssistant] = useState<string[]>([])

    const [transactionResult, setTransactionResult] = useState<TransactionResult[]>([])
    const [bestAssistant, setBestAssistant] = useState<(User | null)[]>([])
    const [popUp, setPopUp] = useState(0)

    function displayPop() {
        if (popUp === 0) {
            setPopUp(1)
        } else {
            setPopUp(0)
        }
    }

    function AssignClick() {
        setError('')
        setBestAssistant([])
        if (selectedTransactions.length === 0 || selectedAssistant.length === 0) {
            setError('Please select transaction and assistant')
        } else {
            selectedTransactions.forEach(transactionNumber => {
                invoke('get_transaction_by_id', { transactionId: transactionNumber }).then((transaction) => {

                    if (transaction) {
                        let tempTransaction = transaction as TransactionForAssistant

                        if (tempTransaction) {
                            invoke('change_nim_to_user', { nimCodes: selectedAssistant }).then((selected_user) => {
                                if (selected_user) {
                                    invoke('get_student_by_nim_and_subject', { nimCodes: selectedAssistant, subjectCode: tempTransaction.subject_code }).then((disqualifiedAssistantRound1) => {
                                        // console.log(selected_user)
                                        // console.log(disqualifiedAssistantRound1)
                                        invoke('get_transaction_by_user_and_subject', { initialCodes: selected_user, subjectCode: tempTransaction.subject_code }).then((disqualifiedAssistantRound2) => {
                                            // console.log(disqualifiedAssistantRound2)
                                            invoke('get_student_by_nim_and_shift', { nimCodes: selectedAssistant, shiftCode: tempTransaction.transaction_shift, inputedDate: tempTransaction.transaction_date }).then((disqualifiedAssistantRound3) => {
                                                // console.log(disqualifiedAssistantRound3)
                                                invoke('get_transaction_by_user_initial_and_shift', { initialCodes: selected_user, shiftCode: tempTransaction.transaction_shift, inputedDate: tempTransaction.transaction_date }).then((disqualifiedAssistantRound4) => {
                                                    // console.log(disqualifiedAssistantRound4)
                                                    invoke('allocate_assistant', { selectedAssistant: selected_user, eliminated1NimCodes: disqualifiedAssistantRound1, eliminated2InitialCodes: disqualifiedAssistantRound2, eliminated3NimCodes: disqualifiedAssistantRound3, eliminated4InitialCodes: disqualifiedAssistantRound4 }).then((champ) => {
                                                        // console.log(champ)
                                                        invoke('selecting_assistance', { assistantList: champ, transactionId: tempTransaction.transaction_id }).then((winner) => {


                                                            if (winner) {
                                                                const tempTransactionResult: TransactionResult = {
                                                                    transactiondata: tempTransaction,
                                                                    initial: winner as User,
                                                                };
                                                                if (tempTransactionResult) {
                                                                    transactionResult.push(tempTransactionResult)
                                                                }


                                                            }
                                                        })
                                                    }).catch(() => {

                                                        const tempTransactionResult: TransactionResult = {
                                                            transactiondata: tempTransaction,
                                                            initial: null,
                                                        };
                                                        if (tempTransactionResult) {
                                                            transactionResult.push(tempTransactionResult)
                                                        }
                                                    })
                                                })
                                            })
                                        })
                                    })
                                }

                            })
                        }
                    }
                })
            });

            displayPop()
        }



    }

    function CancelBtnClick() {
        invoke('delete_proctoring_asssistant', { transactionCode: selectedTransactions }).then((yay) => {
            window.location.reload();
        })
    }

    function SubmitBtnClick() {

        window.location.reload();

    }

    useEffect(() => {
        invoke('get_assistant').then((assistant) => {
            setAllAssistant(assistant as User[])
            setcurrentAssistant(assistant as User[])
        })
    }, [])

    const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { value, checked } = event.target;
        const transactionId = parseInt(value, 10); // Convert value to number

        setSelectedTransactions((prevSelectedTransactions) => {
            if (checked) {
                return [...prevSelectedTransactions, transactionId];
            } else {
                return prevSelectedTransactions.filter((id) => id !== transactionId);
            }
        });
    };



    const Filtering = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setGenerationFilter(event.target.value);

    };

    const handleAssistantCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { value, checked } = event.target;
        setSelectedAssistant((prevSelectedAssistant) => {
            if (checked) {

                return [...prevSelectedAssistant, value];
            } else {
                return prevSelectedAssistant.filter((item) => item !== value);
            }
        });
    };

    const filterClick = () => {
        setSelectedAssistant([])
        if (generationFilter === "all") {
            setcurrentAssistant(allAssitant)
        } else {
            const filteredUsers = allAssitant.filter((user) =>
                user.initial.toLowerCase().includes(generationFilter.toLowerCase())
            );
            setcurrentAssistant(filteredUsers as User[]);
        }

    }

    function makeTransactionBtnClick() {
        navigate('/Exam/Scheduler/Student')
    }

    useEffect(() => {
        invoke('get_all_transactions_that_not_yet_have_assistant').then((transactons) => {
            setTransactionList(transactons as TransactionForAssistant[])
        })
    })
    return (
        <>
            <NavbarComponent />
            <div className="bg-blue-900 h-screen w-screen" style={{ height: "1500px" }}>


                <div className="flex flex-col">
                    <div className="flex flex-row p-11 justify-end">
                        <button className="bg-black text-white hover:bg-gray-700 border-none" onClick={makeTransactionBtnClick}>Make new transaction</button>
                    </div>
                    <div className="flex flex-col px-20">
                        <p className="text-white font-bold underline" style={{ fontSize: "40px" }}>Incomplete Transaction</p>
                        {transactionList.length > 0 && (
                            <>
                                <table className="min-w-full bg-white shadow-md rounded-lg mt-11">
                                    <thead className="sticky top-0 bg-black text-white z-10">
                                        <tr>
                                            <th className="py-3 px-6 text-left border">Room</th>
                                            <th className="py-3 px-6 text-left border">Subject Code</th>
                                            <th className="py-3 px-6 text-left border">Subject Name</th>
                                            <th className="py-3 px-6 text-left border">Transaction Date</th>
                                            <th className="py-3 px-6 text-left border">Shift</th>
                                            <th className="py-3 px-6 text-left border">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-gray-600 text-sm font-light">
                                        {transactionList.map((transaction) => (
                                            <tr className="border-b border-gray-200 hover:bg-gray-100">
                                                <td className="py-3 px-6 text-left whitespace-nowrap border">
                                                    {transaction.room_number}
                                                </td>
                                                <td className="py-3 px-6 text-left whitespace-nowrap border">
                                                    {transaction.subject_code}
                                                </td>
                                                <td className="py-3 px-6 text-left whitespace-nowrap border">
                                                    {transaction.subject_name}
                                                </td>
                                                <td className="py-3 px-6 text-left border">
                                                    {transaction.transaction_date}
                                                </td>
                                                <td className="py-3 px-6 text-left border">
                                                    {transaction.transaction_shift}
                                                </td>
                                                <td className="py-3 px-6 text-left border">
                                                    <input
                                                        type="checkbox"
                                                        value={transaction.transaction_id.toString()}
                                                        style={{ height: "20px", width: "20px" }}
                                                        onChange={handleCheckboxChange}
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </>
                        )}
                        {transactionList.length === 0 && (
                            <p className="text-red-500 text-bold text-center mt-20" style={{ fontSize: "30px" }}>No transactions available.</p>
                        )}
                    </div>

                </div>
                <div className="flex flex-row px-20 justify-between mt-20">
                    <div className="flex flex-col">
                        <div className="flex flex-row items-center">

                            <p className=" ml-11 text-white text-lg font-bold mr-6" style={{ fontSize: "25px" }}>Filter By Generation:</p>
                            <select
                                className="w-auto bg-white border border-gray-400 text-black py-2 px-4 rounded leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                                onChange={Filtering}
                                value={generationFilter}
                            >
                                <option value="" disabled selected>
                                    Select Generation
                                </option>
                                <option value={"all"}>All</option>
                                <option value="18-1">18-1</option>
                                <option value="19-2">19-2</option>
                                <option value="20-1">20-1</option>
                                <option value="21-1">21-1</option>
                                <option value="21-2">21-2</option>
                                <option value="22-1">22-1</option>
                                <option value="22-2">22-2</option>
                                <option value="23-1">23-1</option>
                                <option value="23-2">23-2</option>
                                <option value="24-1">24-1</option>

                            </select>
                            <button className="text-white bg-black border-none hover:bg-gray-700 ml-3 mr-20" onClick={filterClick}>Filter</button>
                            <button className="bg-red-500 border-none text-white hover:bg-red-700 ml-20 mr-9" onClick={AssignClick}>Assign Assistant</button>

                            <p className="text-red-500 font-bold">{errorMsg}</p>
                        </div>
                        <p className="text-white text-lg font-bold mr-6" style={{ fontSize: "25px" }}>Assistant:</p>
                        <div className="ml-6 w-screen mr-11">

                            <div className="grid grid-cols-7 gap-4 mr-11 p-6">

                                {currentAssitant.map((assistant) => (
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            className="form-checkbox h-5 w-5 text-blue-600"
                                            value={assistant.nim}

                                            onChange={handleAssistantCheckboxChange}
                                        />
                                        <span className="ml-2 text-white">{assistant.initial}</span>
                                    </label>
                                ))}
                            </div>
                        </div>


                    </div>
                    {popUp === 1 && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-500 bg-opacity-75">
                            <div className="bg-white w-3/4 p-8 rounded-lg shadow-lg max-h-full overflow-y-auto">
                                <p className="font-bold text-2xl mb-4">Allocate Assistant Result</p>
                                {transactionResult.map((transaction) => (
                                    <div className="mb-8">
                                        <table className="min-w-full bg-white shadow-md rounded-lg mb-4">
                                            <thead className="sticky top-0 bg-gray-800 text-white">
                                                <tr>
                                                    <th className="py-3 px-6 text-left border">Room</th>
                                                    <th className="py-3 px-6 text-left border">Subject Code</th>
                                                    <th className="py-3 px-6 text-left border">Subject Name</th>
                                                    <th className="py-3 px-6 text-left border">Transaction Date</th>
                                                    <th className="py-3 px-6 text-left border">Shift</th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-gray-600 text-sm font-light">
                                                <tr className="border-b border-gray-200 hover:bg-gray-100">
                                                    <td className="py-2 px-6 text-left whitespace-nowrap border">
                                                        {transaction.transactiondata.room_number}
                                                    </td>
                                                    <td className="py-2 px-6 text-left whitespace-nowrap border">
                                                        {transaction.transactiondata.subject_code}
                                                    </td>
                                                    <td className="py-2 px-6 text-left whitespace-nowrap border">
                                                        {transaction.transactiondata.subject_name}
                                                    </td>
                                                    <td className="py-2 px-6 text-left border">
                                                        {transaction.transactiondata.transaction_date}
                                                    </td>
                                                    <td className="py-2 px-6 text-left border">
                                                        {transaction.transactiondata.transaction_shift}
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                        <div className="flex flex-row gap-7">
                                            <p>Proctoring Assistant: </p>
                                            {transaction.initial === null && (
                                                <p className="text-red-500 font-bold">No Suitable Assistant</p>
                                            )}
                                            {transaction.initial !== null && (
                                                <p className="font-bold text-lg">{transaction.initial.initial}</p>
                                            )}
                                        </div>

                                    </div>
                                ))}




                                <div className="flex flex-roow justify-between px-20">
                                    <button

                                        className="bg-red-500 text-white px-20 rounded hover:bg-red-700 transition duration-300 ease-in-out border-none ml-20" onClick={CancelBtnClick}
                                    >
                                        Close
                                    </button>
                                    <button

                                        className="bg-blue-500 text-white py-2 px-20 rounded hover:bg-blue-700 transition duration-300 ease-in-out border-none mr-20" onClick={SubmitBtnClick}
                                    >
                                        Submit
                                    </button>
                                </div>

                            </div>
                        </div>

                    )}

                </div>
            </div>
        </>

    )

}