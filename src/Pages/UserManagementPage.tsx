import { useEffect, useState } from "react";
import NavbarComponent from "../components/NavbarComponent";
import { invoke } from "@tauri-apps/api";

export default function UserManagementPage() {


    const [allUsers, setAllUsers] = useState<User[]>([])
    const [userLibrary, setLibrary] = useState<User[]>([])
    const [search, setSearch] = useState<string>("")
    const [filter, setFilter] = useState<string>("")
    const [popUp, setPopUp] = useState(0)
    const [editUser, seEditUser] = useState<User>()
    const [newRole, setNewRole] = useState('')
    const [newInitial, setNewInitial] = useState('')
    const [errorMsg, setError] = useState('')
    const [passkey, setpassKey] = useState('')

    function submit() {
        if (editUser) {
            if (newRole !== "Student" && newInitial === '') {
                setError("Initial cannot be empty")
            } else if (newRole === "Student" && newInitial !== '') {
                setError("Student cannot have initial")
            } else {
                invoke('find_user_in_db_by_nim', { nimCode: editUser.nim }).then((found) => {
                    if (!found) {
                        invoke('get_user_by_nim', { nimCode: editUser.nim }).then((user) => {

                            invoke('add_user_to_database', { bnNumber: editUser.bn_number, nim: editUser.nim, name: editUser.name, major: editUser.major, userInitial: editUser.initial, role: editUser.role, userPassword: passkey }).then((success) => {
                                if (success) {
                                    invoke('edit_user', { nimCode: editUser.nim, inputRole: newRole, inputInitial: newInitial }).then((berhasil) => {
                                        if (berhasil) {
                                            setPopUp(0)
                                            refresh()
                                        }
                                    })
                                }
                            })
                        })
                    } else {
                        invoke('edit_user', { nimCode: editUser.nim, inputRole: newRole, inputInitial: newInitial }).then((berhasil) => {
                            if (berhasil) {
                                setPopUp(0)
                                refresh()
                            }
                        })
                    }
                })
            }

        }

    }


    const inputnewInitial = (event: React.ChangeEvent<HTMLInputElement>) => {
        setNewInitial(event.target.value);
    };

    const searching = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(event.target.value);
    };

    const editRole = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setNewRole(event.target.value)
    };

    const EditBtnClick = (user: User) => {
        invoke('find_user_in_db_by_nim', { nimCode: user.nim }).then((found) => {
            if (found) {
                invoke('get_user_in_db_by_nim', { nimCode: user.nim }).then((user) => {
                    seEditUser(user as User)
                    const newUser = user as User
                    setNewRole(newUser.role as string)
                    setNewInitial(newUser.initial as string)
                    if (newUser.initial) {
                        setpassKey(newUser.initial)
                    } else {
                        setpassKey(newUser.nim)
                    }
                    setPopUp(1)
                })
            } else {
                invoke('get_user_by_nim', { nimCode: user.nim }).then((user) => {
                    seEditUser(user as User)
                    const newUser = user as User
                    setNewRole(newUser.role as string)
                    setNewInitial(newUser.initial as string)
                    if (newUser.initial) {
                        setpassKey(newUser.initial)
                    } else {
                        setpassKey(newUser.nim)
                    }
                    setPopUp(1)
                })
            }
        })
    }

    function cancel() {
        setPopUp(0)
    }

    const searchByName = () => {
        const filteredUsers = userLibrary.filter((user) =>
            user.name.toLowerCase().includes(search.toLowerCase())
        );
        setAllUsers(filteredUsers as User[]);
    };

    const searchByInitial = () => {
        const usersWithInitial = userLibrary.filter((user) => user.initial && user.initial.trim() !== '');
        const filteredUsers = usersWithInitial.filter((user) =>
            user.initial.toLowerCase().includes(search.toLowerCase())
        );
        setAllUsers(filteredUsers as User[]);
    }

    const searchByNIM = () => {
        const filteredUsers = userLibrary.filter((user) =>
            user.nim.toLowerCase().includes(search.toLowerCase())
        );
        setAllUsers(filteredUsers as User[]);
    };

    const refresh = async () => {
        invoke('filter_user').then((users) => {
            setLibrary(users as User[])
            setAllUsers(users as User[])
        })
    };

    const selectFilterRole = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setFilter(event.target.value)
    };

    const filterByRole = () => {
        const filteredUsers = userLibrary.filter((user) =>
            user.role.toLowerCase().includes(filter.toLowerCase())
        );
        setAllUsers(filteredUsers as User[]);
    };

    useEffect(() => {
        invoke('filter_user').then((users) => {
            setLibrary(users as User[])
            setAllUsers(users as User[])
        })
    }, [])

    return (
        <>
            <NavbarComponent />
            {refresh}
            <div className="bg-blue-900 flex flex-col items-start p-6">
                <div className="flex flex-row my-9 ml-11 gap-7">
                    <input className="rounded-full" value={search} onChange={searching} type="text" placeholder="search user..." style={{ width: "400px" }}></input>
                    <div className="flex flex-row gap-3">
                        <button className="bg-black text-white hover:bg-gray-700 border-none" onClick={searchByName}>Search by Name</button>
                        <button className="bg-black text-white hover:bg-gray-700 border-none" onClick={searchByInitial}>Search by Initial</button>
                        <button className="bg-black text-white hover:bg-gray-700 border-none" onClick={searchByNIM}>Search by NIM</button>
                    </div>
                </div>
                <div className="flex flex-row my-3 ml-11 gap-20">
                    <div className="flex flex-row gap-7 mr-11">
                        <select className="p-2 bg-white text-gray-900" value={filter} onChange={selectFilterRole} style={{ width: "300px" }}>
                            <option value="Student">Student</option>
                            <option value="Assistant">Assistant</option>
                            <option value="Exam Coordinator">Exam Coordinator</option>
                            <option value="Subject Development">Subject Development</option>
                        </select>
                        <button className="bg-black text-white hover:bg-gray-700 border-none mr-20" onClick={filterByRole}>Filter By Role</button>
                    </div>
                    <button className="ml-20 font-bold bg-white shadow-lg hover:bg-gray-200 " onClick={refresh}>Refresh Table</button>
                </div>
                <div className="w-screen flex flex-row">
                    <div className="overflow-x-hidden h-screen w-3/4">
                        {allUsers.length > 0 && (
                            <>
                                <table className="min-w-full bg-white shadow-md rounded-lg ">
                                    <thead className="sticky top-0 bg-black text-white z-10">
                                        <tr>
                                            <th className="py-3 px-6 text-left border">NIM</th>
                                            <th className="py-3 px-6 text-left border">Binusan ID</th>
                                            <th className="py-3 px-6 text-left border">Name</th>
                                            <th className="py-3 px-6 text-left border">Initial</th>
                                            <th className="py-3 px-6 text-left border">Role</th>
                                            <th className="py-3 px-6 text-left border">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-gray-600 text-sm font-light">
                                        {allUsers.map((user) => (
                                            <tr key={user.nim} className="border-b border-gray-200 hover:bg-gray-100">
                                                <td className="py-3 px-6 text-left whitespace-nowrap border">{user.nim}</td>
                                                <td className="py-3 px-6 text-left whitespace-nowrap border">{user.bn_number}</td>
                                                <td className="py-3 px-6 text-left border">{user.name}</td>
                                                <td className="py-3 px-6 text-left border">{user.initial}</td>
                                                <td className="py-3 px-6 text-left border">{user.role}</td>
                                                <td className="py-3 px-6 text-left border">
                                                    <button className="bg-blue-700 text-white rounded hover:bg-blue-500 border-none" onClick={() => EditBtnClick(user)}>Edit</button>
                                                </td>

                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </>
                        )}
                        {allUsers.length === 0 && (
                            <div className="flex flex-row justify-center">
                                <p className="text-red-500 font-bold text-xl my-20">No Users found!</p>
                            </div>
                        )}
                    </div>

                    {popUp === 1 && editUser && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-500 bg-opacity-75">
                            <div className="bg-white w-1/2 p-8 rounded-lg shadow-lg flex flex-col items-center">
                                <div className="flex flex-row justify-center items-center">
                                    <h1 className="size-xl font-bold" style={{ fontSize: "30px" }}>Edit User</h1>
                                </div>
                                <div className="flex flex-row justify-between p-11">
                                    <div className="flex flex-col gap-4 mx-11">
                                        <div className="flex flex-col">
                                            <p>Nim:</p>
                                            <input type="text" readOnly value={editUser.nim}></input>
                                        </div>
                                        <div className="flex flex-col">
                                            <p>Name: </p>
                                            <input type="text" readOnly value={editUser.name}></input>
                                        </div>
                                        <div className="flex flex-col">
                                            <p>Major: </p>
                                            <input type="text" readOnly value={editUser.major}></input>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-4 mx-11">
                                        <div className="flex flex-col">
                                            <p>Binusian ID: </p>
                                            <input type="text" readOnly value={editUser.bn_number}></input>
                                        </div>
                                        <div className="flex flex-col">
                                            <p>Initial: </p>
                                            <input type="text" value={newInitial} onChange={inputnewInitial}></input>
                                        </div>
                                        <div className="flex flex-col">
                                            <p>Role: </p>
                                            <select
                                                className="p-2 bg-white text-gray-900 border"
                                                value={newRole}
                                                onChange={editRole}
                                            >
                                                <option value="Student">Student</option>
                                                <option value="Assistant">Assistant</option>
                                                <option value="Exam Coordinator">Exam Coordinator</option>
                                                <option value="Subject Development">Subject Development</option>
                                            </select>
                                        </div>
                                    </div>

                                </div>
                                <p className="m-5 mt-0 text-red-500 font-bold">{errorMsg}</p>
                                <div className="flex flex-row justify-between w-1/2">
                                    <button className="bg-red-500 text-white hover:bg-red-700 border-none px-10 rounded" onClick={cancel}>Cancel</button>
                                    <button className="bg-blue-500 text-white hover:bg-blue-700 border-none px-10 rounded" onClick={submit}>Submit</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

        </>
    )
}