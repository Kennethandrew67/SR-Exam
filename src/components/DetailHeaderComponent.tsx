import { useNavigate } from "react-router-dom"

export default function DetailHeaderComponent() {
    const navigate = useNavigate();

    function back() {
        navigate('/Home/Page')
    }

    return (
        <>
            <div className="sticky top-0 bg-blue-900 p-6 shadow-lg flex flex-row justify-between z-50">
                <button className="bg-black text-white px-8 py-3 rounded hover:bg-gray-700 border-none" onClick={back}>Back</button>
                <div>
                    <img src="/src/assets/srlogo.png" style={{height: '50px', width:"170px"}}></img>
                </div>
            </div>
        </>
    )
}