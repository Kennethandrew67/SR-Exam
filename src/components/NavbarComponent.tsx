import { invoke } from "@tauri-apps/api"
import { useEffect, useState } from "react"
import { useLocation, Link as RouterLink, useNavigate } from "react-router-dom";

export default function NavbarComponent() {
    const [currentUser, setCurrentUser] = useState<User>()
    const [name, setName] = useState("You are unknown");
    const [id, setID] = useState("You are unknown");
    const location = useLocation();
    const navigate = useNavigate();

    const currentRoute = location.pathname

    const [isHome, setIsHome] = useState(false);
    const [isSubject, setIsSubject] = useState(false);
    const [isUserManagement, setIsUserManagement] = useState(false);
    const [isExamScheduler, setExamScheduler] = useState(false)
    const [isTransaction, setIsTransaction] = useState(false)
    const [isRoomTransaction, setIsRoomTransaction] = useState(false)

    useEffect(() => {
        if (currentRoute === "/Home/Page") {
            setIsHome(true)
        } else if (currentRoute === "/Subject/Management") {
            setIsSubject(true);
        } else if (currentRoute === "/User/Management") {
            setIsUserManagement(true)
        } else if (currentRoute === "/Exam/Scheduler/Home" || currentRoute === "/Exam/Scheduler/Student") {
            setExamScheduler(true)
        } else if (currentRoute === "/Transaction/Page") {
            setIsTransaction(true)
        }else if(currentRoute === "/Room/Transaction"){
            setIsRoomTransaction(true)
        }
    })

    useEffect(() => {
        invoke('get_current_user').then((user) => {
            setCurrentUser(user as User)
        })
    }, [])

    useEffect(() => {
        if (currentUser) {
            setName(currentUser.name)
            if (currentUser.role === "Student") {
                setID(currentUser.nim)
            } else {
                setID(currentUser.initial)
            }
        }
    }, [currentUser])

    function logout() {
        invoke('remove_current_user')
        navigate('/')
    }

    return (
        <>
            <div className="bg-white flex flex-row w-screen items-center justify-between px-12 shadow h-36">
                <div>
                    <img src="/src/assets/srlogo.png" className="h-24"></img>
                </div>

                <div className="flex flex-row mr-6">
                    <div className="flex flex-col justify-center items-end">
                        <p className="font-bold">{name}</p>
                        <p className="font-semibold">{id}</p>
                    </div>
                    <RouterLink to={"/Profile/Page"}>
                        <img src="/src/assets/profilepict.png" className="h-24 rounded-full border mx-6 ml-3 hover:bg-gray-300"></img>
                    </RouterLink>

                    <div className="flex flex-col justify-end">

                        <button className="bg-blue-900 text-white hover:bg-blue-600 border-none" onClick={logout}>Logout</button>
                    </div>
                </div>
            </div>
            <div className="sticky top-0 z-50">

                {/* navbar */}
                <div className=" bg-black w-screen h-16 items-end flex flex-row shadow-lg p-3 ">
                    <RouterLink to={"/Home/Page"}>
                        <p className={`text-white text-xl font-bold ml-6 mr-3 ${isHome ? 'underline' : ''} hover:text-gray-700`}>Home</p>
                    </RouterLink>

                    {currentUser && (currentUser.role === "Exam Coordinator" || currentUser.role === "Subject Development") && (
                        <>
                            <RouterLink to={"/Transaction/Page"}>
                                <p className={`text-white text-xl font-bold ml-6 mr-3 ${isTransaction ? 'underline' : ''}    hover:text-gray-700`}>Transaction</p>
                            </RouterLink>

                            <RouterLink to={"/Subject/Management"}>
                                <p className={`text-white text-xl font-bold ml-6 mr-3 ${isSubject ? 'underline' : ''}    hover:text-gray-700`}>Subject Management</p>
                            </RouterLink>

                            <p className="text-white text-xl font-bold ml-6 mr-3">Report Management</p>
                        </>

                    )}

                    {currentUser && currentUser.role === "Exam Coordinator" && (
                        <>
                            <p className="text-white text-xl font-bold ml-6 mr-3">Schedule</p>
                            <RouterLink to={"/Exam/Scheduler/Home"}>
                                <p className={`text-white text-xl font-bold ml-6 mr-3 ${isExamScheduler ? 'underline' : ''} hover:text-gray-700`}>Exam Scheduler</p>
                            </RouterLink>

                            <RouterLink to={"/User/Management"}>
                                <p className={`text-white text-xl font-bold ml-6 mr-3 ${isUserManagement ? 'underline' : ''} hover:text-gray-700`}>User Management</p>
                            </RouterLink>

                            <RouterLink to={"/Room/Transaction"}>
                                <p className={`text-white text-xl font-bold ml-6 mr-3 ${isRoomTransaction ? 'underline' : ''} hover:text-gray-700`}>Room Management</p>
                            </RouterLink>
                        </>

                    )}

                </div>
            </div>
        </>

    )
}