import { useNavigate, useParams } from "react-router-dom"
import DetailHeaderComponent from "../components/DetailHeaderComponent"
import { useEffect, useState } from "react"
import { event, invoke } from "@tauri-apps/api";

export default function TransactionDetailPage() {
    const [transaction, setTransaction] = useState<TransactionForOtherRole>();
    const [students, setStudents] = useState<StudentDetails[]>([]);
    const { id } = useParams<{ id: string }>();
    const [studentMap, setStudentMap] = useState<string>("Student Mapping")
    const [changeSeatPopUp, setChangeSeatPopUp] = useState<Boolean>(false)
    const [selectStudent, setSelectedStudent] = useState<StudentDetails>()
    const [reason, setReason] = useState('')
    const [newSeatNumber, setNewSeat] = useState('')
    const [changeSeatError, setChangeSeatError] = useState('')
    const [room, setCapacity] = useState<Room>()
    const [notes, setNotes] = useState<TransactionNotes[]>([])

    const [classMinute, setClassMinute] = useState('')
    const [extendclassError, setextendClassError] = useState('')

    const [timeExtensionPopUp, setTimeExtensionPopUp] = useState<Boolean>(false)
    const [studentMinute, setStudentMinute] = useState('')

    const [fileErrorMsg, setFileErrorMsg] = useState('')
    const [verifErrorMsg, setverifErrorMsg] = useState('')

    const [user, setCurrentUser] = useState<User>()
    const [casefile, setFile] = useState<File | null>(null);

    useEffect(() => {

        invoke('get_transaction_for_other_role_by_id', { transactionId: id }).then((t) => {
            if (t) {
                setTransaction(t as TransactionForOtherRole)
                invoke('get_student_by_transaction_id', { transactionId: id }).then((nims) => {

                    setStudents(nims as StudentDetails[])
                    console.log(students)
                })
            }
        })
    }, [])

    useEffect(() => {
        invoke('get_current_user').then((u) => {
            console.log(u)
            setCurrentUser(u as User)
        })
    }, [])

    useEffect(() => {
        invoke('get_room_capacity_by_number', { inputNumber: transaction?.room_number }).then((c) => {
            setCapacity(c as Room)
        })
        invoke('get_transaction_notes', { transactionId: transaction?.transaction_id }).then((result) => {
            if (result) {
                console.log(result)
                setNotes(result as TransactionNotes[])
            }
        })


    }, [transaction])


    const fileDownload = () => {
        console.log("ancjnakcam")


        invoke('get_transaction_case', { transactionId: transaction?.transaction_id }).then((result) => {
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



    const handleOptionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        console.log(notes)
        setStudentMap(event.target.value);
    };

    const handleCardClick = (student: StudentDetails) => {
        setSelectedStudent(student);
        setNewSeat(String(student.seat_number))
        setChangeSeatPopUp(true);
    };

    const CancelBtnClick = () => {
        setChangeSeatError('')
        setReason('')
        setChangeSeatPopUp(false);
    };

    const isTransactionOngoing = () => {
        const transactionStartDate = new Date(`${transaction?.transaction_date} ${transaction?.transaction_start}`);

        const now = new Date()
        if (now > transactionStartDate && transaction?.status === 0) {
            return true
        } else {
            return false
        }
    };

    const isSeatEmpty = (seatNumber: number) => {
        return !students.some(student => student.seat_number === seatNumber);
    };

    const handleSubmit = () => {
        if (!isTransactionOngoing()) {
            setChangeSeatError('Transaction is not ongoing')
            return
        }

        if (newSeatNumber === String(selectStudent?.seat_number)) {
            setChangeSeatError('')
            setChangeSeatPopUp(false)
            return
        }

        if (reason === '' || newSeatNumber === '') {
            setChangeSeatError('All fields must be filled')
            return

        }

        if (Number(newSeatNumber) > Number(room?.room_capacity) - 1) {
            setChangeSeatError('The selected seat number exceeds the allowed capacity.')
            return
        }

        if (!isSeatEmpty(Number(newSeatNumber))) {
            setChangeSeatError('The seat is not empty')
            return
        }

        invoke('change_seat', { transactionId: transaction?.transaction_id, nimCode: selectStudent?.student_nim, seatNumber: Number(newSeatNumber) }).then((suc) => {
            if (suc) {
                let description = selectStudent?.student_nim + " - " + selectStudent?.student_name + " from seat " + selectStudent?.seat_number + " into seat " + newSeatNumber + " " + reason
                invoke('add_transaction_notes', { transactionId: transaction?.transaction_id, notes: description }).then((cces) => {
                    setChangeSeatError('')
                    setChangeSeatPopUp(false)
                    setTransaction(transaction)
                    window.location.reload()
                })

            } else {
                console.log('blokk')
            }
        })

    };

    const handleNewSeatNumberChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setNewSeat(event.target.value);
    };

    const handleReasonChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setReason(event.target.value);
    };

    const handleClassMinuteChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setClassMinute(event.target.value)
    }

    const handleStudentMinuteChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setStudentMinute(event.target.value)
    }

    const addTimeExtensionBtn = () => {
        if (!isTransactionOngoing()) {
            setextendClassError('Transaction is not ongoing')

            return
        }

        if (reason === '' || classMinute === '') {
            setextendClassError('All fields must be filled')

            return
        }

        if (Number(classMinute) > 20) {
            setextendClassError('Cannot more than 20 minutes')
            return
        }


        invoke('add_time_extension_for_class', { transactionId: transaction?.transaction_id, updateQuery: classMinute }).then((suc) => {
            if (suc) {
                let description = "Class Extend for " + classMinute + " minute, because " + reason
                invoke('add_transaction_notes', { transactionId: transaction?.transaction_id, notes: description }).then((cces) => {

                    window.location.reload()
                })
            }
        })
    }

    const addTimeExtensionStudentBtn = () => {
        if (!isTransactionOngoing()) {
            setChangeSeatError('Transaction is not ongoing')

            return
        }
        if (reason === '' || studentMinute === '') {
            setChangeSeatError('All fields must be filled')
            return
        }

        if (Number(studentMinute) > 20) {
            setChangeSeatError('Cannot more than 20 minutes')
            return
        }

        invoke('add_time_extension_for_student', { transactionId: transaction?.transaction_id, nimCode: selectStudent?.student_nim, minute: Number(studentMinute) }).then((success) => {
            let description = selectStudent?.student_nim + " Extend for " + studentMinute + " minute, because " + reason
            invoke('add_transaction_notes', { transactionId: transaction?.transaction_id, notes: description }).then((cces) => {

                window.location.reload()
            })
        })
    }

    const addTimePopUp = (student: StudentDetails) => {
        setReason('')
        setSelectedStudent(student)
        setTimeExtensionPopUp(true)
    }

    const canceladdTimePopUp = () => {
        setReason('')
        setChangeSeatError('')
        setStudentMinute('')
        setTimeExtensionPopUp(false)
    }


    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {

        if (event.target.files) {
            setFile(event.target.files[0]); // Setting the selected file in the component state
        }

    };

    const uploadBtnClick = async () => {
        if (!casefile || !transaction) return;

        if (!casefile || !casefile.name.endsWith('.zip')) {
            // File is missing or not a .zip file
            setFileErrorMsg('File must be .zip');
            return;
        }

        const reader = new FileReader();
        reader.onload = async () => {
            const fileData = new Uint8Array(reader.result as ArrayBuffer);
            invoke('upload_case', {
                file: Array.from(fileData),
                transactionId: transaction.transaction_id,
            }).catch((error) => {
                setFileErrorMsg('error')
            }).then((result) => {
                setFileErrorMsg("File Success Uploaded")
            });

        };
        reader.readAsArrayBuffer(casefile);
    };

    const navigate = useNavigate();

    const verifyBtnClick = () => {
        const transactionendDate = new Date(`${transaction?.transaction_date} ${transaction?.transaction_end}`);

        // Get the current time
        const currentTime = new Date();


        const thirtyMinutesBeforeEnd = new Date(transactionendDate);
        thirtyMinutesBeforeEnd.setMinutes(thirtyMinutesBeforeEnd.getMinutes() - 30);


        if (currentTime >= thirtyMinutesBeforeEnd) {
            invoke('verify_transaction', { transactionId: transaction?.transaction_id }).then((suc) => {
                navigate('/Home/Page')
            })
        } else {
            setverifErrorMsg('Transaction verification is only allowed 30 minutes before end')
        }
    };


    return (
        <>
            <DetailHeaderComponent />

            <div className="min-h-screen bg-black p-6 flex flex-col">
                {changeSeatPopUp === true && (
                    <>
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-500 bg-opacity-75">
                            <div className="bg-white w-1/3 pt-8 rounded-lg shadow-lg flex flex-col">
                                <div className="flex flex-row justify-center items-center">
                                    <h1 className="size-xl font-bold" style={{ fontSize: "30px" }}>Change Seat</h1>

                                </div>

                                <div className="flex flex-row p-11">
                                    <div className="flex flex-col gap-4 mx-11">
                                        <div className="flex flex-col">
                                            <p>Seat Number:</p>
                                            <input type="number" onChange={handleNewSeatNumberChange} value={newSeatNumber}></input>
                                        </div>
                                        <div className="flex flex-col">
                                            <p>Reason: </p>
                                            <textarea onChange={handleReasonChange} className="px-3 h-32 border"></textarea>
                                        </div>

                                    </div>

                                </div>
                                <div className="flex flex-row justify-center items-center">
                                    <p className="m-5 mt-0 text-red-500 font-bold">{changeSeatError}</p>
                                </div>

                                <div className="flex flex-row justify-between w-1/2 px-11 pb-6 gap-6">
                                    <button className="bg-red-500 text-white hover:bg-red-700 border-none mx-11 px-10 rounded" onClick={CancelBtnClick} >Cancel</button>
                                    <button className="bg-blue-500 text-white hover:bg-blue-700 border-none px-10 rounded" onClick={handleSubmit}>Submit</button>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {timeExtensionPopUp === true && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-500 bg-opacity-75">
                        <div className="bg-white w-1/3 pt-8 rounded-lg shadow-lg flex flex-col">
                            <div className=" px-8 pt-6 pb-8 mb-4">
                                <h2 className="text-xl font-semibold mb-4">Add Time Extension for Student</h2>

                                <div className="mb-4 flex flex-row items-center">
                                    <label className="block text-gray-700 font-bold mb-2 mr-11">Minutes:</label>
                                    <input
                                        type="number"
                                        onChange={handleStudentMinuteChange}
                                        value={studentMinute}
                                    />
                                </div>
                                <div className="mb-6 flex flex-col items-start">
                                    <label className="block text-gray-700 font-bold mb-2">Reason:</label>
                                    <textarea
                                        placeholder="Enter reason..."
                                        className="appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                        onChange={handleReasonChange}

                                    ></textarea>
                                </div>
                                <div className="flex flex-row justify-center items-center">
                                    <p className="m-5 mt-0 text-red-500 font-bold">{changeSeatError}</p>
                                </div>
                                <button className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 mr-11 px-4 rounded focus:outline-none focus:shadow-outline" onClick={canceladdTimePopUp}>Cancel</button>
                                <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline" onClick={addTimeExtensionStudentBtn}>Submit</button>
                            </div>
                        </div>
                    </div>
                )}


                <div className="flex flex-col md:flex-row justify-between max-w-5xl">
                    <div className="mb-8 md:mr-8 p-6 ml-11 mt-11">
                        <div className="flex items-center mb-4">
                            <p className="text-lg font-semibold text-white mr-2">Subject Code:</p>
                            <p className="text-lg text-white">{transaction?.subject_code}</p>
                        </div>
                        <div className="flex items-center mb-4">
                            <p className="text-lg font-semibold text-white mr-2">Transaction Date:</p>
                            <p className="text-lg text-white">{transaction?.transaction_date}</p>
                        </div>
                        <div className="flex items-center mb-4">
                            <p className="text-lg font-semibold text-white mr-2">Room:</p>
                            <p className="text-lg text-white">{transaction?.room_number}</p>
                        </div>
                    </div>
                    <div className="p-6 ml-6">
                        <div className="flex items-center mb-4 mt-11">
                            <p className="text-lg font-semibold text-white mr-2">Subject Name:</p>
                            <p className="text-lg text-white">{transaction?.subject_name}</p>
                        </div>
                        <div className="flex items-center mb-4">
                            <p className="text-lg font-semibold text-white mr-2">Transaction Time:</p>
                            <p className="text-lg text-white">{transaction?.transaction_start} - {transaction?.transaction_end}</p>
                        </div>
                        <div className="flex items-center mb-4">
                            <p className="text-lg font-semibold text-white mr-2">Proctoring Assistant:</p>
                            <p className="text-lg text-white">{transaction?.initial}</p>
                        </div>
                    </div>

                </div>

                {user?.role !== 'Assistant' && (
                    <div className="flex ml-11 items-center gap-6">

                        <input type="file" className="border-2 font-bold" onChange={handleFileChange} />


                        <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" onClick={uploadBtnClick}>
                            Upload
                        </button>


                        <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" onClick={fileDownload}>
                            Download
                        </button>

                        <p className="text-red-500 ml-11 text-lg font-bold">{fileErrorMsg}</p>
                    </div>
                )}

                {user?.role === 'Assistant' && isTransactionOngoing() === true && (
                    <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" onClick={fileDownload}>
                        Download Case
                    </button>
                )}


                <div className="mt-11">
                    <div className="px-20 flex flex-row gap-10">
                        <label className="text-white">
                            <input
                                type="radio"
                                value="Student Mapping"
                                checked={studentMap === "Student Mapping"}
                                onChange={handleOptionChange}
                            />
                            Student Mapping
                        </label>
                        <label className="text-white">
                            <input
                                type="radio"
                                value='Student Details'
                                checked={studentMap === "Student Details"}
                                onChange={handleOptionChange}
                            />
                            Student Details
                        </label>

                    </div>
                </div>





                <div className="flex flex-wrap justify-center px-6">
                    {studentMap === "Student Mapping" && students
                        .sort((a, b) => a.seat_number - b.seat_number)
                        .map((student) => (
                            <div
                                className="w-24 text-center bg-[#e4e3dc] m-1 p-2 rounded-lg shadow-md"
                                key={student.student_nim}
                                onClick={() => handleCardClick(student)}
                            >
                                <h2 className="text-sm font-bold mb-1">Seat: {student.seat_number}</h2>
                                <img
                                    src="/src/assets/profpict.png"
                                    alt="Student"
                                    className="w-16 h-16 rounded-full mx-auto mb-1"
                                />
                                <p className="text-xs font-bold">{student.student_name}</p>
                                <p className="text-xs text-gray-600">{student.student_nim}</p>
                            </div>
                        ))}
                </div>
                {studentMap === "Student Details" && (


                    <div className="w-screen flex flex-row pl-11 pt-6 ml-11">
                        <div className="overflow-x-hidden h-96 w-3/4">
                            {studentMap === "Student Details" && (
                                <>
                                    <table className="min-w-full bg-white shadow-md rounded-lg ">
                                        <thead className="sticky top-0 bg-blue-900 text-white z-10">
                                            <tr>
                                                <th className="py-3 px-6 text-left border">Student NIM</th>

                                                <th className="py-3 px-6 text-left border">Student Name</th>
                                                <th className="py-3 px-6 text-left border">Seat Number</th>
                                                <th className="py-3 px-6 text-left border">Submission Status</th>
                                                <th className="py-3 px-6 text-left border">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-gray-600 text-sm font-light">
                                            {students.map((student) => (
                                                <tr key={student.student_nim} className="border-b border-gray-200 hover:bg-gray-100">
                                                    <td className="py-3 px-6 text-left whitespace-nowrap border">{student.student_nim}</td>
                                                    <td className="py-3 px-6 text-left whitespace-nowrap border">{student.student_name}</td>
                                                    <td className="py-3 px-6 text-left whitespace-nowrap border">{student.seat_number}</td>
                                                    <td className="py-3 px-6 text-left border">{student.submission_status}</td>

                                                    <td className="py-3 px-6 text-left border">
                                                        <button className="bg-blue-700 text-white rounded hover:bg-blue-500 border-none" onClick={() => addTimePopUp(student)}>Add Time Extension</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </>
                            )}
                        </div>
                    </div>
                )}

                <div className="pl-6 mt-11">
                    <p className="text-lg font-semibold text-white mr-2">TRANSACTION NOTES: </p>
                    <div className="pl-11">
                        {notes.map((note) => (
                            <p className="text-lg font-semibold text-white mr-2">*{note.description}</p>
                        ))}
                    </div>


                </div>

                <div className="container mx-auto mt-8">
                    <div className="bg-gray-200 shadow-md rounded px-8 pt-6 pb-8 mb-4">
                        <h2 className="text-xl font-semibold mb-4">Add Time Extension for Class</h2>

                        <div className="mb-4 flex flex-row items-center">
                            <label className="block text-gray-700 font-bold mb-2 mr-11">Minutes:</label>
                            <input
                                type="number"
                                onChange={handleClassMinuteChange}
                                value={classMinute}
                            />
                        </div>
                        <div className="mb-6 flex flex-col items-start">
                            <label className="block text-gray-700 font-bold mb-2">Reason:</label>
                            <textarea
                                placeholder="Enter reason..."
                                className="appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                onChange={handleReasonChange}

                            ></textarea>
                        </div>
                        <div className="flex flex-row justify-center items-center">
                            <p className="m-5 mt-0 text-red-500 font-bold">{extendclassError}</p>
                        </div>
                        <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline" onClick={addTimeExtensionBtn}>Submit</button>

                    </div>
                </div>

                {user?.role === 'Assistant' && transaction?.status === 0 && (
                    <div className="flex mt-11 justify-end">
                        <p className="m-5 mt-0 text-red-500 font-bold text-lg">{verifErrorMsg}</p>
                        <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline" onClick={verifyBtnClick}>Verify Transaction</button>
                    </div>
                )}

            </div>
        </>
    )
}