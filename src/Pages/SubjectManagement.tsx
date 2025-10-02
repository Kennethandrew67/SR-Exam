import { useEffect, useState } from "react"
import NavbarComponent from "../components/NavbarComponent"
import { invoke } from "@tauri-apps/api"

export default function SubjectManagementPage() {
    const [subjects, setSubject] = useState<Subject[]>([])
    const [filter, setFilter] = useState<string>('')
    const [allsubject, setall] = useState<Subject[]>([])

    const inputFilter = (event: React.ChangeEvent<HTMLInputElement>) => {
        setFilter(event.target.value);
    };

    useEffect(() => {
        invoke('get_all_subject').then((subjects) => {
            setall(subjects as Subject[])
            setSubject(subjects as Subject[])
        })
    }, [])

    const filterByName = () => {
        const filteredSubjects = allsubject.filter((subject) =>
            subject.subject_name.toLowerCase().includes(filter.toLowerCase())
        );
        setSubject(filteredSubjects as Subject[]);
    };

    const filterByCode = () => {
        const filteredSubjects = allsubject.filter((subject) =>
            subject.subject_code.toLowerCase().includes(filter.toLowerCase())
        );
        setSubject(filteredSubjects as Subject[]);
    };

    const refresh = () => {
        setSubject(allsubject)
    }

    return (

        <div className="bg-blue-900 ">
            <NavbarComponent />
            <div className="flex">
                {subjects.length > 0 && (
                    <>
                        <div className="m-4 overflow-x-hidden  h-screen">
                            <table className=" min-w-max flex-grow">
                                <thead className="sticky top-0">
                                    <tr>
                                        <th className="text-white bg-black border px-4 py-2 w-60">Subject Code</th>
                                        <th className="text-white bg-black border px-4 py-2" style={{ width: '700px' }}>Subject Name</th>
                                    </tr>
                                </thead>
                                {subjects.map((subject) => (
                                    <tr>
                                        <td className="bg-gray-300 border px-4 py-2">{subject.subject_code}</td>
                                        <td className="bg-gray-200 border px-4 py-2">{subject.subject_name}</td>
                                    </tr>
                                ))}
                            </table>
                        </div>
                    </>
                )}

                {subjects.length === 0 && (
                    <div className="m-4  h-screen flex flex-row justify-center" style={{ width: '956px' }}>
                        <p className="text-red-500 font-bold text-xl my-20">No subjects found!</p>
                    </div>
                )}




                <div className="p-6 flex flex-col items-start">
                    <div className="m-6">
                        <input type="border" style={{ width: '300px' }} value={filter} onChange={inputFilter} placeholder="search subject..."></input>
                        <button className="mr-4  ml-3 text-white bg-black font-bold shadow-lg hover:bg-gray-800 border-none" onClick={refresh}>Refresh</button>
                    </div>
                    <div className="m-6 my-3 flex flex-row">
                        <button className="mr-4 text-white bg-black font-bold shadow-lg hover:bg-gray-800 border-none" onClick={filterByName}>Search By Name</button>
                        <button className="mr-4 text-white bg-black font-bold shadow-lg hover:bg-gray-800 border-none" onClick={filterByCode}>Search By Code</button>
                    </div>
                </div>
            </div >

        </div >
    )
}