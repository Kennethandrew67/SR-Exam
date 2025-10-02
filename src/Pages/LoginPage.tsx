import { invoke } from "@tauri-apps/api";
import { useState } from "react";
import { useNavigate } from "react-router-dom";



export default function LoginPage() {

    const [username, setUsername] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [errorMsg, setError] = useState<string>("");
    const navigate = useNavigate();
    const [tempUser, setUser] = useState<User>();

    const inputUsername = (event: React.ChangeEvent<HTMLInputElement>) => {
        setUsername(event.target.value);
    };

    const inputPassword = (event: React.ChangeEvent<HTMLInputElement>) => {
        setPassword(event.target.value);
    };

    function isNim(input: string): boolean {
        return /^\d+$/.test(input)
    }

    const LoginBtn = async () => {
        if (username === '' || password === '') {
            setError('Username or password cannot be empty!');
        } else {
            if (isNim(username)) {
                invoke('get_user_by_nim', { nimCode: username }).then((user) => {

                    const newUser = user as User
                    setUser(newUser as User)
                    if (newUser) {
                        invoke('find_user_in_db_by_nim', { nimCode: username }).then((found) => {
                            if (found) {
                                invoke('authenticate_in_db_by_nim', { nimCode: username, inputPassword: password }).then((verif) => {
                                    if (verif) {
                                        invoke('set_current_user', { bnNumber: newUser.bn_number, nim: newUser.nim, name: newUser.name, major: newUser.major, userInitial: newUser.initial, role: "Student" }).then((succ) => {
                                            if (succ) {
                                                navigate('/Home/Page')
                                                tempUser
                                            } else {

                                                
                                                setError('errrror cookkk')
                                            }
                                        })
                                    } else {
                                        setError('Wrong Password')
                                    }
                                })
                            } else {
                                invoke('get_password_by_nim', { nimCode: username }).then((authpass) => {
                                    invoke('authenticaton', { inputPassword: password, hashPassword: authpass }).then((match) => {
                                        if (match) {
                                            invoke('add_user_to_database', { bnNumber: newUser.bn_number, nim: newUser.nim, name: newUser.name, major: newUser.major, userInitial: newUser.initial, role: newUser.role, userPassword: password }).then((go) => {
                                                if (go) {
                                                    invoke('set_current_user', { bnNumber: newUser.bn_number, nim: newUser.nim, name: newUser.name, major: newUser.major, userInitial: newUser.initial, role: "Student" }).then((succ) => {
                                                        if (succ) {
                                                            navigate('/Home/Page')
                                                        } else {
                                                            setError('errrror cookkk')
                                                        }
                                                    })

                                                }
                                            })

                                        } else {
                                            setError('Wrong Password')
                                        }
                                    }).catch(() => {

                                    })
                                })
                            }
                        })
                    }
                }).catch(() => {
                    setError('Username not found');
                })
            } else {
                invoke('get_user_by_initial', { initialCode: username.toUpperCase() }).then((user) => {
                    const newUser = user as User
                    setUser(newUser)
                    if (newUser) {
                        invoke('find_user_in_db_by_initial', { initialCode: username }).then((found) => {
                            if (found) {

                                invoke('get_user_in_db_by_nim', { nimCode: newUser.nim }).then((tempUser) => {

                                    invoke('authenticate_in_db_by_initial', { initialCode: username, inputPassword: password }).then((verif) => {
                                        if (verif) {

                                            const real = tempUser as User
                                            invoke('set_current_user', { bnNumber: real.bn_number, nim: real.nim, name: real.name, major: real.major, userInitial: real.initial, role: real.role }).then((succ) => {
                                                if (succ) {

                                                    navigate('/Home/Page')
                                                } else {
                                                    setError('errrror cookkk')
                                                }
                                            })
                                        } else {
                                            setError('Wrong Password')
                                        }
                                    })
                                })

                            } else {
                                invoke('get_password_by_nim', { nimCode: newUser.nim }).then((authpass) => {
                                    // setError(authpass as string)
                                    invoke('authenticaton', { inputPassword: password, hashPassword: authpass }).then((match) => {
                                        if (match) {
                                            invoke('add_user_to_database', { bnNumber: newUser.bn_number, nim: newUser.nim, name: newUser.name, major: newUser.major, userInitial: newUser.initial, role: newUser.role, userPassword: password }).then((go) => {
                                                if (go) {
                                                    invoke('set_current_user', { bnNumber: newUser.bn_number, nim: newUser.nim, name: newUser.name, major: newUser.major, userInitial: newUser.initial, role: newUser.role }).then((succ) => {
                                                        if (succ) {
                                                            navigate('/Home/Page')
                                                        } else {
                                                            setError('errrror cookkk')
                                                        }
                                                    })
                                                }
                                            })
                                        } else {
                                            setError('Wrong Password')
                                        }
                                    }).catch(() => {

                                    })
                                }).catch(() => {
                                    setError("not found lol")
                                })
                            }
                        })


                    }
                }).catch(() => {
                    invoke('find_user_in_db_by_initial', { initialCode: username }).then((found) => {
                        if (found) {
                            invoke('get_user_in_db_by_initial', { initialCode: username }).then((tempUser) => {
                                invoke('authenticate_in_db_by_initial', { initialCode: username, inputPassword: password }).then((verif) => {
                                    if (verif) {

                                        const real = tempUser as User
                                        invoke('set_current_user', { bnNumber: real.bn_number, nim: real.nim, name: real.name, major: real.major, userInitial: real.initial, role: real.role }).then((succ) => {
                                            if (succ) {

                                                navigate('/Home/Page')
                                            } else {
                                                setError('errrror cookkk')
                                            }
                                        })
                                    } else {
                                        setError('Wrong Password')
                                    }
                                })
                            })
                        } else {
                            setError("Username not found")
                        }
                    })
                })
            }


        }
    }

    return (

        <div className="bg-blue-900 h-screen flex items-center justify-center" >

            <div className="bg-white p-6 rounded-xl shadow-lg w-96">
                <img src="./src/assets/srlogo.png"></img>

                <div className="flex mt-3 items-center justify-between">
                    <input type="text" className="border w-full px-2 py-2 my-3" value={username} onChange={inputUsername} placeholder="Username"></input>
                </div>

                <div className="flex mt-3 items-center justify-between">
                    <input type="password" className="border w-full px-2 py-2 mb-3" value={password} onChange={inputPassword} placeholder="Password"></input>
                </div>
                <div className="my-3 flex justify-center">
                    <label className="text-red-500 font-bold">{errorMsg}</label>
                </div>
                <div>
                    <button className="w-full bg-blue-500 text-white font-semibold hover:bg-blue-800 " onClick={LoginBtn}>Login</button>
                </div>
            </div>
        </div>
    )
};



