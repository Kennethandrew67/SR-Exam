import { invoke } from "@tauri-apps/api";
import { useEffect, useState } from "react";
import {  useNavigate } from "react-router-dom";
import DetailHeaderComponent from "../components/DetailHeaderComponent";

export default function ProfilePage() {
    const [currentUser, setCurrentUser] = useState<User>()
    const [name, setName] = useState("You are unknown");
    const [nim, setNim] = useState("You are unknown");
    const [bn_number, setbinusianNumber] = useState("You are unknown")
    const [major, setMajor] = useState("You are unknown")
    const [initial, setInitial] = useState("You are unknown")
    const [role, setRole] = useState("You are unknown")
    const [change, setChange] = useState(1)
    const navigate = useNavigate();

    const [oldpass, setOldPass] = useState<string>("")
    const [newpass, setnewPass] = useState<string>("")
    const [confirmpass, setconfirmPass] = useState<string>("")
    const [error, setError] = useState<string>("")

    const inputOldPassword = (event: React.ChangeEvent<HTMLInputElement>) => {
        setOldPass(event.target.value);
    };
    const inputNewPassword = (event: React.ChangeEvent<HTMLInputElement>) => {
        setnewPass(event.target.value);
    };
    const inputConfirmPassword = (event: React.ChangeEvent<HTMLInputElement>) => {
        setconfirmPass(event.target.value);
    };

    useEffect(() => {
        invoke('get_current_user').then((user) => {
            setCurrentUser(user as User)
        })
    }, [])

    useEffect(() => {
        if (currentUser) {
            setName(currentUser.name)
            setNim(currentUser.nim)
            setbinusianNumber(currentUser.bn_number)
            setMajor(currentUser.major)
            setRole(currentUser.role)
            if (role !== "Student") {
                setInitial(currentUser.initial)
            }
        }
    }, [currentUser])

    function submit() {
        if (oldpass === '' || newpass === '' || confirmpass === '') {
            setError("All fields must be filled")
        } else {
            invoke('authenticate_in_db_by_nim', { nimCode: nim, inputPassword: oldpass }).then((verif) => {
                if (verif) {
                    if (oldpass === newpass) {
                        setError("Your new password cannot be the same as your current password")
                    } else {
                        if (newpass === confirmpass) {
                            invoke('change_password', { nimCode: nim, inputPassword: newpass }).then((done) => {
                                if (done) {
                                    window.location.reload();
                                }
                            })
                        } else {
                            setError("Wrong Confirmation Password")
                        }
                    }
                } else {
                    setError('Wrong Current Password')
                }
            })
        }
    }

    function logout() {
        invoke('remove_current_user')
        navigate('/')
    }

    function isDisplay() {
        setError('')
        if (change === 1) {
            setChange(2)
        } else {
            setChange(1)
        }
    }
    return (
        <>
            <DetailHeaderComponent />
            <div
                className="min-h-screen flex justify-center items-center py-6"
                style={{
                    backgroundImage: `url(/src/assets/background.jpeg)`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat"
                }}
            >
                <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
                    <h1 className="text-3xl font-bold mb-4 text-center">User Profile</h1>
                    <div className="mb-4">
                        <label className="block text-lg font-semibold mb-2">NIM:</label>
                        <input
                            type="text"
                            value={nim}
                            className="w-full px-3 py-2 border rounded-lg"
                            readOnly
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block text-lg font-semibold mb-2">Name:</label>
                        <input
                            type="text"
                            value={name}
                            className="w-full px-3 py-2 border rounded-lg"
                            readOnly
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block text-lg font-semibold mb-2">BN Number:</label>
                        <input
                            type="text"
                            value={bn_number}
                            className="w-full px-3 py-2 border rounded-lg"
                            readOnly
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block text-lg font-semibold mb-2">Major:</label>
                        <input
                            type="text"
                            value={major}
                            className="w-full px-3 py-2 border rounded-lg"
                            readOnly
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block text-lg font-semibold mb-2">Role:</label>
                        <input
                            type="text"
                            value={role}
                            className="w-full px-3 py-2 border rounded-lg"
                            readOnly
                        />
                    </div>
                    {role !== "Student" && (
                        <div className="mb-4">
                            <label className="block text-lg font-semibold mb-2">Initial:</label>
                            <input
                                type="text"
                                value={initial}
                                className="w-full px-3 py-2 border rounded-lg"
                                readOnly
                            />
                        </div>
                    )}
                    <button className="bg-red-500 text-white font-bold hover:bg-red-800 border-none" onClick={isDisplay}>Change Password</button>
                    <button className="bg-blue-500 text-white font-bold hover:bg-blue-900 border-none ml-9" onClick={logout}>Logout</button>
                    {change === 2 && (
                        <div className="mt-4">
                            <div className="mb-4">
                                <label className="block text-lg font-semibold mb-2">Current Password:</label>
                                <input
                                    type="password"
                                    className="w-full px-3 py-2 border rounded-lg"
                                    placeholder="enter your current password.."
                                    value={oldpass}
                                    onChange={inputOldPassword}
                                />
                            </div>

                            <div className="mb-4">
                                <label className="block text-lg font-semibold mb-2">New Password:</label>
                                <input
                                    type="password"
                                    className="w-full px-3 py-2 border rounded-lg"
                                    placeholder="enter your new password.."
                                    value={newpass}
                                    onChange={inputNewPassword}
                                />
                            </div>

                            <div className="mb-4">
                                <label className="block text-lg font-semibold mb-2">Confirmation:</label>
                                <input
                                    type="password"
                                    className="w-full px-3 py-2 border rounded-lg"
                                    placeholder="confirm your password..."
                                    value={confirmpass}
                                    onChange={inputConfirmPassword}
                                />
                            </div>

                            <div className="mb-4">
                                <label className=" font-bold text-red-500 mb-2">{error}</label>

                            </div>
                            <button className="bg-blue-500 text-white hover:bg-blue-700" onClick={submit}>Submit</button>
                        </div>
                    )}

                </div>
            </div>
        </>
    )
}