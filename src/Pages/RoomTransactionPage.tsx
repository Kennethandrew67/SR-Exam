import { useEffect, useState } from "react";
import NavbarComponent from "../components/NavbarComponent";
import { invoke } from "@tauri-apps/api";

export default function RoomTransactionPage() {
    const [selectDate, setSelectDate] = useState<string>(new Date().toISOString().substring(0, 10))
    const [allRooms, setAllRooms] = useState<Room[]>([])
    const [selectRoom, setSelectedRoom] = useState<(Room | null)>(null)
    const [selectRoomstr, setSelectedRoomstr] = useState<string>('')
    const [resultSchedule, setResultSchedule] = useState<TransactionForOtherRole[]>([])

    const inputDate = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSelectDate(event.target.value);
    };

    const selectingRoom = (event: React.ChangeEvent<HTMLSelectElement>) => {


        const roomNumber = event.target.value;

        if (roomNumber === "all") {
            setSelectedRoom(null)
        } else {
            const selectedRoom = allRooms.find(room => room.room_number === roomNumber);
            setSelectedRoomstr(roomNumber)
            setSelectedRoom(selectedRoom as Room);
        }


    };


    function GenerateBtnClick() {
        // console.log(selectRoom)
        console.log(selectDate)
        if (!selectRoom) {
            invoke('get_transactions_by_date', { roomNumbers: allRooms, inputedDate: selectDate }).then((result) => {
                if (result) {
                    setResultSchedule(result as TransactionForOtherRole[])
                } else {
                    console.log("slur")
                }

            })
        } else {
            invoke('get_transactions_by_room_and_date', { roomNumber: selectRoomstr, inputedDate: selectDate }).then((result) => {
                if (result) {
                    setResultSchedule(result as TransactionForOtherRole[])
                }

            })
        }
        console.log(resultSchedule)
    }

    useEffect(() => {
        invoke('get_all_room').then((rooms) => {
            setAllRooms(rooms as Room[])
        })
    }, [])

    const renderScheduleCell = (roomNumber: string, startTime: string) => {
        const scheduleItem = resultSchedule.find((result) => result.room_number === roomNumber && result.transaction_start === startTime);
        if (scheduleItem) {
            return (
                <td className="bg-red-500 border border-black h-12" title={scheduleItem.subject_code + '-' + scheduleItem.subject_name + '-' + scheduleItem.initial}>

                </td>
            );
        } else {
            return (
                <td className=" border border-black h-12 ">

                </td>   
            );
        }
    };

    return (
        <>
            <NavbarComponent />
            <div className="bg-blue-900 max-screen w-screen overflow-y">
                <div className="flex flex-col p-11 gap-11">
                    <div className="flex flex-row gap-6 items-center">
                        <p className="text-white px-1">Select Date: </p>
                        <input type="date" value={selectDate} onChange={inputDate}></input>
                    </div>
                    <div className="flex flex-row gap-6 items-center">
                        <p className="text-white">Select Room: </p>
                        <select
                            className="w-auto bg-white border border-gray-400 text-black py-2 px-4 rounded leading-tight focus:outline-none focus:bg-white focus:border-gray-500" onChange={selectingRoom}


                        >
                            <option value="all" selected>
                                All Room
                            </option>
                            {allRooms.map((room) => (
                                <option value={room.room_number}>
                                    {room.room_number}
                                </option>
                            ))}
                        </select>
                        <button onClick={GenerateBtnClick}>Generate</button>
                    </div>
                    <div className="flex flex-col overflow-y-auto overflow-x-hidden max-h-[600px]">

                        <table className="border border-gray-500 relative">
                            <thead className="bg-black text-white h-10 sticky top-50 sticky top-0">
                                <tr>
                                    <th></th>
                                    <th></th>
                                    <th className="relative text-left">
                                        <p className="absolute -left-2 text-lg top-0">07.20</p>
                                    </th>
                                    <th className="relative text-left">
                                        <p className="absolute -left-2 top-0 text-lg ">09.20</p>
                                    </th>
                                    <th className="relative text-left">
                                        <p className="absolute -left-2 top-0  text-lg">11.20</p>
                                    </th>
                                    <th className="relative text-left">
                                        <p className="absolute -left-2 top-0  text-lg">13.20</p>
                                    </th>
                                    <th className="relative text-left">
                                        <p className="absolute -left-2 top-0 text-lg ">15.20</p>
                                    </th>
                                    <th className="relative text-left">
                                        <p className="absolute -left-2 top-0 text-lg ">17.20</p>
                                        <p className="absolute right-0 top-0 text-lg ">19.00</p>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectRoom === null ? (
                                    // Render all rooms if selectRoom is null
                                    allRooms.map((room) => (
                                        <tr key={room.room_number}>
                                            <td className="border border-black w-32 p-2 text-white">{room.room_number}</td>
                                            <td className="border border-black w-32 p-2 text-white ">{room.room_capacity}</td>
                                            {renderScheduleCell(room.room_number, '07:20:00')}
                                            {renderScheduleCell(room.room_number, '09:20:00')}
                                            {renderScheduleCell(room.room_number, '11:20:00')}
                                            {renderScheduleCell(room.room_number, '13:20:00')}
                                            {renderScheduleCell(room.room_number, '15:20:00')}
                                            {renderScheduleCell(room.room_number, '17:20:00')}
                                        </tr>
                                    ))
                                ) : (
                                    // Render selectRoom details if it's not null
                                    <tr key={selectRoom?.room_number}>
                                        <td className="border border-black w-32 p-2 text-white">{selectRoom?.room_number}</td>
                                        <td className="border border-black w-32 p-2 text-white">{selectRoom?.room_capacity}</td>
                                        {renderScheduleCell(selectRoomstr, '07:20:00')}
                                        {renderScheduleCell(selectRoomstr, '09:20:00')}
                                        {renderScheduleCell(selectRoomstr, '11:20:00')}
                                        {renderScheduleCell(selectRoomstr, '13:20:00')}
                                        {renderScheduleCell(selectRoomstr, '15:20:00')}
                                        {renderScheduleCell(selectRoomstr, '17:20:00')}
                                    </tr>
                                )}
                            </tbody>
                        </table>

                    </div>
                </div>
            </div>
        </>
    )
}