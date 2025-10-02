import { useEffect, useState } from "react";
import NavbarComponent from "../components/NavbarComponent";
import { invoke } from "@tauri-apps/api";
import { useNavigate } from "react-router-dom";


export default function TransactionPage() {

    class TransactionDateFilter {
        private date: string;

        constructor(date: string) {
            this.date = date;
        }

        isSatisfy(transaction: TransactionForOtherRole): boolean {
            const transactionDate = this.parseDate(transaction.transaction_date);
            if (this.date === "") {
                return true;
            }
            const selectedDate = new Date(this.date);

            // console.log('Transaction Date:', transactionDate);
            // console.log('Selected Date:', selectedDate);

            const satisfy = (
                transactionDate.getFullYear() === selectedDate.getFullYear() &&
                transactionDate.getMonth() === selectedDate.getMonth() &&
                transactionDate.getDate() === selectedDate.getDate()
            );

            // console.log('Satisfy:', satisfy);

            return satisfy;
        }

        private parseDate(dateString: string): Date {
            const [, day, monthName, year] = dateString.split(' ');

            const months = [
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'
            ];
            const monthIndex = months.findIndex(month => month === monthName);

            const parsedDate = new Date(parseInt(year), monthIndex, parseInt(day));
            return parsedDate;
        }
    }

    class ProctoringAssistantFilter {
        private initial: string;

        constructor(initial: string) {
            this.initial = initial;
        }

        isSatisfy(transaction: TransactionForOtherRole): boolean {
            if (this.initial === "") {
                return true;
            }
            if (this.initial === "all") {
                return true;
            }
            return transaction.initial === this.initial;
        }
    }

    class SubjectCodeFilter {
        private subject_code: string;

        constructor(subject_code: string) {
            this.subject_code = subject_code;
        }

        isSatisfy(transaction: TransactionForOtherRole): boolean {
            if (this.subject_code === "") {
                return true;
            }
            if (this.subject_code === "all") {
                return true;
            }
            console.log(this.subject_code)
            return transaction.subject_code === this.subject_code;
        }
    }

    class SubjectNameFilter {
        private subject_name: string;

        constructor(subject_name: string) {
            this.subject_name = subject_name.trim();
        }

        isSatisfy(transaction: TransactionForOtherRole): boolean {
            if (this.subject_name === "") {
                return true;
            }

            const normalizedSubjectName = this.subject_name.toLowerCase();
            const transactionSubjectName = transaction.subject_name.toLowerCase();

            return transactionSubjectName.includes(normalizedSubjectName);
        }
    }

    class RoomFilter {
        private room_number: string;

        constructor(room_number: string) {
            this.room_number = room_number;
        }

        isSatisfy(transaction: TransactionForOtherRole): boolean {
            if (this.room_number === "") {
                return true;
            }
            if (this.room_number === "all") {
                return true;
            }

            return transaction.room_number === this.room_number;
        }
    }

    class StatusFilter {
        private status: string;

        constructor(status: string) {
            this.status = status;
        }

        isSatisfy(transaction: TransactionForOtherRole): boolean {
            if (this.status === "") {
                return true;
            }
            if (this.status === "all") {
                return true;
            }

            if (this.status === "finished") {

                return transaction.status === 1;
            } else if (this.status === "unfinished") {
                const transactionStartDate = new Date(`${transaction.transaction_date} ${transaction.transaction_start}`);
                return new Date() < transactionStartDate && transaction.status === 0;
            } else {
                const transactionStartDate = new Date(`${transaction.transaction_date} ${transaction.transaction_start}`);


                return new Date() >= transactionStartDate && transaction.status === 0
            }


        }
    }
    const [allRooms, setAllRooms] = useState<Room[]>([])
    const [allTransactions, setAllTransactions] = useState<TransactionForOtherRole[]>([])
    const [displayTransaction, setDisplayTransaction] = useState<TransactionForOtherRole[]>([])
    const [allAssistant, setAllAssistant] = useState<User[]>([])
    const [allSubjects, setAllSubjects] = useState<Subject[]>([])

    const [selectedDate, setSelectedDate] = useState<string>('')
    const [selectedAssistant, setSelectedAssistant] = useState<string>('')
    const [selectedSubjectCode, setSelectedSubjectCode] = useState<string>('')
    const [subjectName, setSubjectName] = useState<string>('')
    const [selectedRoom, setSelectedRoom] = useState<string>('')
    const [selectedStatus, setSelectedStatus] = useState<string>('')

    const [errorMsg, setError] = useState<string>('')

    useEffect(() => {
        invoke('get_all_transactions').then((transactions) => {
            setAllTransactions(transactions as TransactionForOtherRole[])
            setDisplayTransaction(transactions as TransactionForOtherRole[])
        })
    }, [])

    useEffect(() => {
        invoke('get_assistant').then((assistant) => {
            setAllAssistant(assistant as User[])

        })
    }, [])

    useEffect(() => {
        invoke('get_all_room').then((rooms) => {
            setAllRooms(rooms as Room[])
        })
    })

    useEffect(() => {
        invoke('get_all_subject').then((subjects) => {
            setAllSubjects(subjects as Subject[])
        })
    }, [])



    const inputSubjectName = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSubjectName(event.target.value);
    };

    const inputDate = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedDate(event.target.value);

    };

    const selectingAssistant = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedAssistant(event.target.value);
    };

    const selectingStatus = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedStatus(event.target.value);
    };

    const selectingSubjectCode = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedSubjectCode(event.target.value);
    };

    const selectingRoom = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedRoom(event.target.value);
    };

    const FilterBtnClick = () => {

        const dateFilter = new TransactionDateFilter(selectedDate);
        const assistantFilter = new ProctoringAssistantFilter(selectedAssistant);
        const subjectcodeFilter = new SubjectCodeFilter(selectedSubjectCode);
        const subjectNameFilter = new SubjectNameFilter(subjectName);
        const roomFilter = new RoomFilter(selectedRoom)
        const statusFilter = new StatusFilter(selectedStatus)
        const filteredTransactions = allTransactions.filter(transaction => dateFilter.isSatisfy(transaction) && assistantFilter.isSatisfy(transaction) && subjectcodeFilter.isSatisfy(transaction) && subjectNameFilter.isSatisfy(transaction) && roomFilter.isSatisfy(transaction) && statusFilter.isSatisfy(transaction));

        // console.log('Filtered Transactions:', filteredTransactions); 
        setDisplayTransaction(filteredTransactions);
        // console.log(displayTransaction)
    };

    const navigate = useNavigate();

    const rowClick = (t: TransactionForOtherRole) => {
        navigate(`/Transaction/Detail/${t.transaction_id}`);
    }

    return (
        <>
            <NavbarComponent />
            <div className="bg-blue-900 h-screen w-screen">
                <p>{errorMsg}</p>
                <div className="flex flex-col p-11 ">
                    <div className="flex flex-row my-6 items-center gap-7">
                        <p className="text-white">Filter By Date: </p>
                        <input type="date" onChange={inputDate} value={selectedDate}></input>
                        <p className="text-white ml-3">Select Assistant: </p>
                        <select
                            className=" w-auto bg-white border border-gray-400 text-black py-2 px-4 rounded leading-tight focus:outline-none focus:bg-white focus:border-gray-500" onChange={selectingAssistant}
                        >
                            <option disabled selected>
                                Select Assistant
                            </option>
                            <option value="all">
                                All
                            </option>
                            {allAssistant.map((assistnt) => (
                                <option value={assistnt.initial}>
                                    {assistnt.initial}
                                </option>
                            ))}
                        </select>


                    </div>
                    <div className="flex flex-row my-6 items-center gap-7">
                        <p className="text-white">Select Subject Code:  </p>
                        <select
                            className=" w-auto bg-white border border-gray-400 text-black py-2 px-4 rounded leading-tight focus:outline-none focus:bg-white focus:border-gray-500" onChange={selectingSubjectCode}
                        >
                            <option disabled selected>
                                Select Subject
                            </option>
                            <option value="all">
                                All Subject
                            </option>
                            {allSubjects.map((subject) => (
                                <option value={subject.subject_code}>
                                    {subject.subject_code} - {subject.subject_name}
                                </option>
                            ))}
                        </select>
                        <p className="text-white">Select Room:  </p>
                        <select
                            className=" w-auto bg-white border border-gray-400 text-black py-2 px-4 rounded leading-tight focus:outline-none focus:bg-white focus:border-gray-500" onChange={selectingRoom}
                        >
                            <option disabled selected>
                                Select Room
                            </option>
                            <option value="all">
                                All Rooms
                            </option>
                            {allRooms.map((room) => (
                                <option value={room.room_number}>
                                    {room.room_number}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex flex-row my-6 items-center gap-7">
                        <input className="rounded-full" onChange={inputSubjectName} type="text" placeholder="search by subject name..." style={{ width: "400px" }}></input>

                        <p className="text-white">Select Status: </p>
                        <select
                            className=" w-auto bg-white border border-gray-400 text-black py-2 px-4 rounded leading-tight focus:outline-none focus:bg-white focus:border-gray-500 mr-20" onChange={selectingStatus}
                        >
                            <option disabled selected>
                                Select Status
                            </option>
                            <option value="all">
                                All Status
                            </option>
                            <option value="unfinished">Unfinished</option>
                            <option value="finished">Finished</option>
                            <option value="ongoing">Ongoing</option>
                        </select>
                        <button className="ml-20 bg-black text-white border-none hover:bg-gray-800" onClick={FilterBtnClick}>Filter</button>
                    </div>
                    <p className="text-white " style={{ fontSize: "25px" }}>All Transactions</p>
                    <div>
                        {displayTransaction.length !== 0 && (
                            <table className="min-w-full bg-white shadow-md rounded-lg mt-5">
                                <thead className="sticky top-0 bg-black text-white z-10">
                                    <tr>
                                        <th className="py-3 px-6 text-left border">Room</th>
                                        <th className="py-3 px-6 text-left border">Subject Code</th>
                                        <th className="py-3 px-6 text-left border">Subject Name</th>
                                        <th className="py-3 px-6 text-left border">Transaction Date</th>
                                        <th className="py-3 px-6 text-left border">Transaction Time</th>
                                        <th className="py-3 px-6 text-left border">Proctoring Assistant</th>
                                    </tr>
                                </thead>
                                <tbody className="text-gray-600 text-sm font-light">
                                    {displayTransaction.map((transaction) => (
                                        <tr className="border-b border-gray-200 hover:bg-gray-100" onClick={() => rowClick(transaction)}>
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
                                                {transaction.transaction_start} - {transaction.transaction_end}
                                            </td>
                                            <td className="py-3 px-6 text-left border">
                                                {transaction.initial}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                        {displayTransaction.length === 0 && (
                            <h1 className="text-red-500 font-bold mt-20" style={{ fontSize: "25px" }}>There is no such transactions</h1>
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}