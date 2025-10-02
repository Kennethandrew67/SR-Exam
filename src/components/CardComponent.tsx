export default function CardComponent({ user }: { user: User }, seat_number: Int32Array) {
    return (
        <div className="flex flex-col p-4">
            <p>Seat Number: {seat_number}</p>
            <h1 className="text-l font-bold">{user.bn_number}</h1>
            <p className="text-l">{user.name}</p>
            <p className="text-l">{user.nim}</p>
        </div>
    )
}