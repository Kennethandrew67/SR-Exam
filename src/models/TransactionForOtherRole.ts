interface TransactionForOtherRole {
    transaction_id: number;
    subject_code: string;
    subject_name: string;
    room_number: string;
    transaction_date: string;
    transaction_start: string; 
    transaction_end: string;   
    initial: string;
    transactioncase: File | null;
    status: number;
}
