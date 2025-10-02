import { useNavigate } from "react-router-dom";
import NavbarComponent from "../components/NavbarComponent";
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api";

export default function AllocateStudentPage() {
    const navigate = useNavigate()
    const [allsubjects, setAllSubjects] = useState<Subject[]>([])
    const [selectedSubject, setSelectedSubject] = useState('')
    const [classOption, setClassOption] = useState<string[]>([])
    const [selectedClass, setSelectedClass] = useState<string[]>([])
    const [allRooms, setAllRooms] = useState<Room[]>([])
    const [error, setError] = useState('')

    const [popUp, setPopUp] = useState(0)

    function Cancel() {
        setSuccessStudents([])
        setEliminateStudent1([])
        setEliminateStudent2([])
        setFailedStudents([])
        setNims([])
        if (popUp === 1) {
            setPopUp(0)
        } else {
            setPopUp(1)
        }
    }

    const [selectedDate, setSelectedDate] = useState('')
    const [selectedShift, setSelectedShift] = useState(0)
    const [selectedRoom, setSelectedRoom] = useState('')

    const [currentRoom, setCurrentRoom] = useState<Room>()
    const [currentSubject, setcurrentSubject] = useState<Subject>()

    const [successStudents, setSuccessStudents] = useState<User[]>([])

    const [eliminateStudentsRound1, setEliminateStudent1] = useState<User[]>([])
    const [eliminateStudentsRound2, setEliminateStudent2] = useState<User[]>([])
    const [failedStudent, setFailedStudents] = useState<User[]>([])

    const [listOfNims, setNims] = useState<string[]>([])


    const SUbmitBtnClick = async () => {
        invoke('add_transaction_header', { subjectCode: selectedSubject, roomCode: selectedRoom, inputedDate: selectedDate, inputShift: selectedShift, subjectName: currentSubject?.subject_name }).then((success) => {
            if (success) {
                invoke('get_transactionid_by_room_and_shift', { roomCode: selectedRoom, shiftCode: selectedShift, inputedDate: selectedDate }).then((transactionIDe) => {
                    if (transactionIDe !== 0) {
                        console.log(listOfNims)
                        invoke('add_student_to_transaction', { transactionId: transactionIDe, nimCodes: listOfNims }).then((succ) => {
                            if (succ) {
                                setPopUp(0)
                                navigate('/Exam/Scheduler/Home')
                            } else {
                                setError('Ga masuk di db cuy')
                            }
                        })
                    }
                })
            }
        })
    }

    const CreateExamBtnClick = async () => {

        if (selectedSubject === '' || selectedClass.length === 0 || selectedDate === '' || selectedShift === 0 || selectedRoom === '') {
            setError('Please fill all the fields!')
        }
        else {
            invoke('get_subject_by_code', { inputCode: selectedSubject }).then((subject) => {
                setcurrentSubject(subject as Subject)
            })
            const tempDate = new Date(selectedDate)
            const currDate = new Date();

            if (tempDate <= currDate) {
                setError('Selected date must be in the future!')
            } else {

                // console.log(selectedClass)
                invoke('find_transaction_by_room_and_shift', { shiftCode: selectedShift, roomCode: selectedRoom, inputedDate: selectedDate }).then((found) => {
                    if (found) {
                        setError('The Room already has another transaction! Please choose another room')
                    } else {
                        invoke('get_students_by_class_and_subject_code', { subjectCode: selectedSubject, inputCode: selectedClass }).then((students) => {

                            if (students) {

                                invoke('get_student_by_nim_and_subject', { nimCodes: students, subjectCode: selectedSubject }).then((disqualifiedStudent1) => {
                                    // console.log(disqualifiedStudent1)

                                    invoke('get_student_by_nim_and_shift', { nimCodes: students, shiftCode: selectedShift, inputedDate: selectedDate }).then((disqualifiedstudent2) => {


                                        invoke('get_room_capacity_by_number', { inputNumber: selectedRoom }).then((room) => {

                                            if (room) {
                                                setCurrentRoom(room as Room)
                                                const roomCapacity = room as Room
                                                invoke('student_mapping', { nimCodes: students, eliminated1NimCodes: disqualifiedStudent1, eliminated2NimCodes: disqualifiedstudent2, capacity: roomCapacity.room_capacity }).then((nimsResult) => {
                                                    console.log(nimsResult)
                                                    if (nimsResult) {
                                                        console.log(nimsResult)
                                                        const result = nimsResult as StudentMapping
                                                        console.log(result)
                                                        invoke('change_nim_to_user', { nimCodes: disqualifiedStudent1 }).then((dis1p) => {
                                                            setEliminateStudent1(dis1p as User[])
                                                        })
                                                        invoke('change_nim_to_user', { nimCodes: disqualifiedstudent2 }).then((dis1p) => {
                                                            setEliminateStudent2(dis1p as User[])
                                                        })
                                                        invoke('change_nim_to_user', { nimCodes: result.success_group }).then((sucusers) => {
                                                            setSuccessStudents(sucusers as User[])
                                                            invoke('change_nim_to_user', { nimCodes: result.failed_group }).then((fstudent) => {
                                                                setFailedStudents(fstudent as User[])
                                                                if (sucusers || fstudent) {
                                                                    setNims(result.success_group as string[])

                                                                    setPopUp(1)
                                                                }
                                                            })

                                                        })

                                                    } else {
                                                        setError('Ga berhasil')
                                                    }
                                                }).catch(() => {
                                                    invoke('change_nim_to_user', { nimCodes: disqualifiedStudent1 }).
                                                        then((dis1p) => {
                                                            setEliminateStudent1(dis1p as User[])
                                                        })
                                                    invoke('change_nim_to_user', { nimCodes: disqualifiedstudent2 }).then((dis1p) => {
                                                        setEliminateStudent2(dis1p as User[])
                                                    })
                                                    setPopUp(1)

                                                })
                                            }
                                        })

                                    }).catch(() => {
                                        setError('HI')
                                    })
                                }).catch(() => {
                                    setError('cukurukk')
                                })
                            }

                        })
                    }
                })
            }



        }
    }







    const selectingRoom = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedRoom(event.target.value);
    };

    const selectingTime = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedShiftValue = parseInt(event.target.value, 10);
        setSelectedShift(selectedShiftValue)
    };

    const inputDate = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedDate(event.target.value);
    };

    const selectingSubject = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const subjectCode = event.target.value;
        setSelectedSubject(subjectCode);
        setSelectedClass([])
        setClassOption([]);
        setError('');
        if (subjectCode) {
            invoke('get_class_by_subject_code', { subjectCode })
                .then((listOfClass) => {
                    const tempClass = listOfClass as string[];
                    setClassOption(tempClass);
                })

        }
    };

    const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { value, checked } = event.target;

        if (value === 'all') {
            if (checked) {
                setSelectedClass(classOption);
            } else {
                setSelectedClass([]);
            }
        } else {
            setSelectedClass((prevSelectedClass) => {
                if (checked) {

                    return [...prevSelectedClass, value];
                } else {
                    return prevSelectedClass.filter((item) => item !== value);
                }
            });
        }


    };


    useEffect(() => {
        invoke('get_all_room').then((rooms) => {
            setAllRooms(rooms as Room[])
        })
    })


    useEffect(() => {
        invoke('get_all_subject').then((subjectsFromApi) => {
            if (subjectsFromApi) {
                setAllSubjects(subjectsFromApi as Subject[])
            }

        })
    }, [])



    function backBtnClick() {
        navigate('/Exam/Scheduler/Home')
    }
    return (
        <>
            <NavbarComponent />
            {popUp === 1 && (
                <div className=" fixed inset-0 z-50 flex items-center justify-center bg-gray-500 bg-opacity-75 overflow-y-auto p-20">
                    <div className="bg-white w-3/4 p-8 rounded-lg shadow-lg max-h-full overflow-y-auto">
                        <h2 className="text-3xl font-bold mb-6">Transaction Detail</h2>
                        <div className="flex flex-col md:flex-row justify-between">
                            <div className="mb-8 md:mr-8">
                                <div className="flex items-center mb-4">
                                    <p className="text-lg font-semibold mr-2">Transaction Date:</p>
                                    <p className="text-lg">{selectedDate}</p>
                                </div>
                                <div className="flex items-center mb-4">
                                    <p className="text-lg font-semibold mr-2">Transaction Shift:</p>
                                    <p className="text-lg">{selectedShift}</p>
                                </div>
                                <div className="flex items-center mb-4">
                                    <p className="text-lg font-semibold mr-2">Room:</p>
                                    <p className="text-lg">{selectedRoom}</p>
                                </div>
                            </div>
                            <div className="">
                                <div className="flex items-center mb-4">
                                    <p className="text-lg font-semibold mr-2">Subject Code:</p>
                                    <p className="text-lg">{selectedSubject}</p>
                                </div>
                                <div className="flex items-center mb-4">
                                    <p className="text-lg font-semibold mr-2">Subject Name:</p>
                                    <p className="text-lg">{currentSubject?.subject_name}</p>
                                </div>
                                <div className="flex items-center mb-4">
                                    <p className="text-lg font-semibold mr-2">Room Capacity:</p>
                                    <p className="text-lg">{currentRoom?.room_capacity}</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-wrap -mx-4 mt-6 pl-20">
                            {successStudents && successStudents.map((student, index) => (
                                <div className="flex flex-col p-4 border mb-4 mr-4 w-1/5">
                                    <p className="font-semibold">Seat Number: {index + 1}</p>
                                    <p className="font-bold text-blue-900 text-lg">{student.nim}</p>
                                    <p>{student.name}</p>
                                    <p>{student.bn_number}</p>
                                </div>
                            ))}
                        </div>
                        <div className="mt-8">
                            {failedStudent && (
                                <div>
                                    <p className="text-red-500 font-bold text-lg">Students without seat number:</p>
                                    {failedStudent.map((student) => (
                                        <p key={student.nim}>{student.nim} - {student.name}</p>
                                    ))}
                                </div>
                            )}
                            {eliminateStudentsRound1 && (
                                <div>
                                    <p className="text-red-500 font-bold text-lg mt-6">Students with conflicting exams:</p>
                                    {eliminateStudentsRound1.map((student) => (
                                        <p key={student.nim}>{student.nim} - {student.name}</p>
                                    ))}
                                </div>
                            )}
                            {eliminateStudentsRound2 && (
                                <div>
                                    <p className="text-red-500 font-bold text-lg">Students with schedule clashes:</p>
                                    {eliminateStudentsRound2.map((student) => (
                                        <p key={student.nim}>{student.nim} - {student.name}</p>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="flex flex-row justify-between px-20 mt-10">
                            <button className=" bg-red-500 text-white font-semibold hover:bg-red-700 border-none" style={{ width: '300px' }} onClick={Cancel}>Cancel</button>
                            {successStudents.length !== 0 && (
                                <button className=" bg-blue-500 text-white font-semibold hover:bg-blue-700 border-none" style={{ width: '300px' }} onClick={SUbmitBtnClick}>Submit</button>
                            )}

                        </div>
                    </div>
                </div>
            )}

            <div className="bg-gray-700 w-screen" style={{ height: '1000px' }}>
                <div className="flex flex-col p-11 items-start">
                    <div className="flex flex-row mb-11">
                        <button className="bg-blue-500 text-white hover:bg-blue-700 border-none" onClick={backBtnClick}>Back</button>
                    </div>
                    <div className="flex flex-row">
                        <div className="flex flex-row items-center gap-5 ml-6">
                            <p className="text-white text-lg font-bold">Subject Code:</p>
                            <select
                                className=" w-auto bg-white border border-gray-400 text-black py-2 px-4 rounded leading-tight focus:outline-none focus:bg-white focus:border-gray-500" onChange={selectingSubject} value={selectedSubject}
                            >
                                <option value="" disabled selected>
                                    Select a Subject
                                </option>
                                {allsubjects.map((subject) => (
                                    <option key={subject.subject_code} value={subject.subject_code}>
                                        {`${subject.subject_code}-${subject.subject_name}`}
                                    </option>
                                ))}
                            </select>
                        </div>

                    </div>
                    <div className="flex flex-row mt-8 items-center">


                        <div className="flex flex-row items-center gap-5 ml-6">
                            <p className="text-white text-lg font-bold mb-4 mt-4">Date:</p>
                            <input type="date" onChange={inputDate}></input>
                        </div>
                        <div className="flex flex-row items-center gap-5 ml-11">
                            <p className="text-white text-lg font-bold mb-4 mt-4">Time:</p>
                            <select className=" w-auto bg-white border border-gray-400 text-black py-2 px-4 rounded leading-tight focus:outline-none focus:bg-white focus:border-gray-500" onChange={selectingTime}>
                                <option disabled selected>
                                    Select the time
                                </option>
                                <option value={1}><p>07.20 - 09.00 (Shift 1)</p></option>
                                <option value={2}><p>09.20 - 11.00 (Shift 2)</p></option>
                                <option value={3}><p>11.20 - 13.00 (Shift 3)</p></option>
                                <option value={4}><p>13.20 - 15.00 (Shift 4)</p></option>
                                <option value={5}><p>15.20 - 17.00 (Shift 5)</p></option>
                                <option value={6}><p>17.20 - 19.00 (Shift 6)</p></option>
                            </select>

                        </div>


                        <div className="flex flex-row items-center gap-5 ml-11">
                            <p className="text-white text-lg font-bold mb-4 mt-4">Room:</p>
                            <select
                                className="w-auto bg-white border border-gray-400 text-black py-2 px-4 rounded leading-tight focus:outline-none focus:bg-white focus:border-gray-500" onChange={selectingRoom}


                            >
                                <option value="" disabled selected>
                                    Select a Room
                                </option>
                                {allRooms.map((room) => (
                                    <option value={room.room_number}>
                                        {room.room_number}
                                    </option>
                                ))}
                            </select>
                        </div>

                    </div>

                    <h2 className="text-white text-lg font-bold ml-6 mt-11">Assign Class:</h2>
                    <div className="ml-6 w-screen mt-6">

                        <div className="grid grid-cols-7 gap-4">
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    className="form-checkbox h-5 w-5 text-blue-600"
                                    value="all"
                                    checked={selectedClass.length === classOption.length}
                                    onChange={handleCheckboxChange}
                                />
                                <span className="ml-2 text-white font-bold">Check All</span>
                            </label>
                            {classOption.map((classOption) => (
                                <label key={classOption} className="flex items-center">
                                    <input
                                        type="checkbox"
                                        className="form-checkbox h-5 w-5 text-blue-600"
                                        value={classOption}
                                        checked={selectedClass.includes(classOption)}
                                        onChange={handleCheckboxChange}
                                    />
                                    <span className="ml-2 text-white">{classOption}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className="flex flex-row items-center gap-4">
                        <button className="ml-8 mt-8 bg-red-500 text-white font-semibold hover:bg-red-700 border-none" onClick={CreateExamBtnClick}>Create Exam</button>
                        <p className="text-lg mt-7 ml-7 text-red-500 font-bold">{error}</p>
                    </div>
                </div>
            </div>
        </>
    )
}