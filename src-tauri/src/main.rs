// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
#![allow(unused)]

use std::{any::Any, clone, f32::INFINITY, fmt::format, ptr::null, result, string, sync::Mutex};

use bcrypt::{hash, verify, DEFAULT_COST};
use chrono::format::ParseError;
use chrono::NaiveDateTime;
use cynic::{http::SurfExt, QueryBuilder};
use mysql::{params, prelude::Queryable as _, Conn, Pool};
use schema::__fields::{
    Enrollment::class_code,
    Mutation::_create_multiple_user_arguments::input,
    Query::{getUserByInitial, getUserByNIM},
};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use tauri::State;

#[cynic::schema("srexam")]
mod schema {}

#[derive(cynic::QueryFragment, Debug, Serialize, Clone)]
pub struct User {
    #[cynic(rename = "bn_number")]
    pub bn_number: cynic::Id,
    pub initial: Option<String>,
    pub major: String,
    pub name: String,
    pub nim: String,
    pub role: String,
}

#[derive(cynic::QueryFragment, Debug)]
#[cynic(graphql_type = "Query")]
pub struct AllUserQuery {
    pub get_all_user: Vec<User>,
}

#[tauri::command]
async fn get_all_user() -> Result<Vec<User>, ()> {
    let operation = AllUserQuery::build(());
    let response = surf::post("https://academic-slc.apps.binus.ac.id/tpa-241/query")
        .run_graphql(operation)
        .await
        .unwrap();

    return Ok(response.data.unwrap().get_all_user);
}

#[derive(cynic::QueryVariables, Debug)]
pub struct GetUserByNimVariables<'a> {
    pub nim: &'a str,
}

#[derive(cynic::QueryFragment, Debug)]
#[cynic(graphql_type = "Query", variables = "GetUserByNimVariables")]
pub struct GetUserByNim {
    #[arguments(nim: $nim)]
    #[cynic(rename = "getUserByNIM")]
    pub get_user_by_nim: Option<User>,
}

#[tauri::command]
async fn get_user_by_nim(nim_code: String) -> Result<Option<User>, String> {
    let operation = GetUserByNim::build(GetUserByNimVariables {
        nim: nim_code.as_str(),
    });

    let response = surf::post("https://academic-slc.apps.binus.ac.id/tpa-241/query")
        .run_graphql(operation)
        .await
        .map_err(|err| format!("Failed to fetch user data: {}", err))?;

    if let Some(data) = response.data {
        Ok(data.get_user_by_nim)
    } else {
        Err("User not found".to_string())
    }
}

#[derive(cynic::QueryVariables, Debug)]
pub struct GetPasswordByNimQueryVariables<'a> {
    pub nim: &'a str,
}

#[derive(cynic::QueryFragment, Debug)]
#[cynic(graphql_type = "Query", variables = "GetPasswordByNimQueryVariables")]
pub struct GetPasswordByNimQuery {
    #[arguments(nim: $nim)]
    #[cynic(rename = "getPasswordByNIM")]
    pub get_password_by_nim: String,
}

#[tauri::command]
async fn get_password_by_nim(nim_code: String) -> Result<String, String> {
    let operation = GetPasswordByNimQuery::build(GetPasswordByNimQueryVariables {
        nim: nim_code.as_str(),
    });

    let response = surf::post("https://academic-slc.apps.binus.ac.id/tpa-241/query")
        .run_graphql(operation)
        .await
        .map_err(|err| format!("Failed to fetch user data: {}", err))?;

    if let Some(data) = response.data {
        Ok(data.get_password_by_nim)
    } else {
        Err("Wrong password".into())
    }
}

#[tauri::command]
async fn authenticaton(input_password: &str, hash_password: &str) -> Result<bool, String> {
    match verify(input_password, hash_password) {
        Ok(matches) => Ok(matches),
        Err(err) => Err(format!("Failed to verify password")),
    }
}

#[derive(cynic::QueryVariables, Debug)]
pub struct GetUserByInitialQueryVariables<'a> {
    pub initial: &'a str,
}

#[derive(cynic::QueryFragment, Debug)]
#[cynic(graphql_type = "Query", variables = "GetUserByInitialQueryVariables")]
pub struct GetUserByInitialQuery {
    #[arguments(initial: $initial)]
    pub get_user_by_initial: Option<User>,
}

#[tauri::command]
async fn get_user_by_initial(initial_code: String) -> Result<Option<User>, String> {
    let operation = GetUserByInitialQuery::build(GetUserByInitialQueryVariables {
        initial: initial_code.as_str(),
    });

    let response = surf::post("https://academic-slc.apps.binus.ac.id/tpa-241/query")
        .run_graphql(operation)
        .await
        .map_err(|err| format!("Failed to fetch user data: {}", err))?;

    if let Some(data) = response.data {
        Ok(data.get_user_by_initial)
    } else {
        Err("User not found".to_string())
    }
}

#[tauri::command]
async fn filter_user(mysql_pool: State<'_, Pool>) -> Result<Vec<User>, ()> {
    let user_api = get_all_user().await.unwrap();
    let user_db = get_all_user_in_db(mysql_pool).await.unwrap();

    let existing_nims: HashSet<_> = user_db.iter().map(|user| &user.nim).collect();

    let filtered_users: Vec<User> = user_api
        .into_iter()
        .filter_map(|api_user| {
            if existing_nims.contains(&api_user.nim) {
                user_db
                    .iter()
                    .find(|db_user| db_user.nim == api_user.nim)
                    .cloned()
            } else {
                Some(api_user)
            }
        })
        .collect();

    Ok(filtered_users)
}

async fn get_all_user_local() -> Result<Vec<User>, String> {
    let operation = AllUserQuery::build(());
    let response = surf::post("https://academic-slc.apps.binus.ac.id/tpa-241/query")
        .run_graphql(operation)
        .await
        .map_err(|err| format!("Failed to fetch user data: {}", err))?;

    if let Some(data) = response.data {
        Ok(data.get_all_user)
    } else {
        Err("User not found".to_string())
    }
}

#[tauri::command]
async fn get_assistant(mysql_pool: State<'_, Pool>) -> Result<Vec<User>, String> {
    let user_api_result = get_all_user_local()
        .await
        .map_err(|err| format!("Failed to fetch users from API"));
    let user_db_result = get_all_user_in_db(mysql_pool)
        .await
        .map_err(|err| format!("Failed to fetch users from database:"));

    let user_api = match user_api_result {
        Ok(users) => users,
        Err(err) => return Err(err),
    };

    let user_db = match user_db_result {
        Ok(users) => users,
        Err(err) => return Err(err),
    };

    let existing_nims: HashSet<_> = user_db.iter().map(|user| &user.nim).collect();

    let mut filtered_users: Vec<User> = Vec::new();
    let mut seen_nims: HashSet<String> = HashSet::new();

    for user in user_db.clone() {
        if user.role == "Assistant" && seen_nims.insert(user.nim.clone()) {
            filtered_users.push(user.clone())
        }
    }

    for api_user in user_api {
        if api_user.role == "Assistant"
            && !existing_nims.contains(&api_user.nim)
            && seen_nims.insert(api_user.nim.clone())
        {
            filtered_users.push(api_user);
        }
    }

    Ok(filtered_users)
}

struct MySQLConfig {
    user: String,
    sqlpassword: String,
    host: String,
    database: String,
}

impl MySQLConfig {
    fn new(user: String, sqlpassword: String, host: String, database: String) -> Self {
        return Self {
            user,
            sqlpassword,
            host,
            database,
        };
    }

    fn format_url(&self) -> String {
        return format!(
            "mysql://{}:{}@{}/{}",
            self.user, self.sqlpassword, self.host, self.database
        );
    }
}

fn hashing(input_password: &str) -> String {
    let hashed_password = hash(input_password, DEFAULT_COST).expect("lol");
    return (hashed_password);
}

#[tauri::command]
fn add_user_to_database(
    nim: &str,
    bn_number: &str,
    name: &str,
    major: &str,
    user_initial: Option<&str>,
    role: &str,
    user_password: &str,
    mysql_pool: State<Pool>,
) -> bool {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");

    let query = "INSERT INTO msuser (nim, bn_number, name, major, initial, role, password) \
         VALUES (:nim, :bn_number, :name, :major, :initial, :role, :password)";

    let hash_password = hashing(user_password);

    let result = conn.exec_drop(
        query,
        params! {
            "nim" =>nim,
            "bn_number" => bn_number,
            "name" => name,
            "major" => major,
            "initial" => user_initial,
            "role" => role,
            "password" => hash_password
        },
    );

    return true;
}

#[tauri::command]
fn find_user_in_db_by_nim(nim_code: String, mysql_pool: State<Pool>) -> bool {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");
    let query = "SELECT nim FROM msuser WHERE nim = :nim";
    let result2: Option<(String)> = conn
        .exec_first(
            query,
            params! {
                "nim" => nim_code,
            },
        )
        .expect("Failed to execute query");

    if let Some(result) = result2 {
        return true;
    } else {
        return false;
    }
}

#[tauri::command]
async fn get_user_in_db_by_nim(nim_code: String, mysql_pool: State<'_, Pool>) -> Result<User, ()> {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");
    let query = "SELECT nim, bn_number, name, major, initial, role FROM msuser WHERE nim = :nim";
    let result2: Option<(String, String, String, String, Option<String>, String)> = conn
        .exec_first(
            query,
            params! {
                "nim" => nim_code,
            },
        )
        .expect("Failed to execute query");

    if let Some((nim, bn_number, name, major, initial, role)) = result2 {
        let user: User = User {
            bn_number: cynic::Id::new(bn_number),
            initial: initial,
            major: major,
            name: name,
            nim: nim,
            role: role,
        };
        return Ok(user);
    } else {
        return Err(());
    }
}

#[tauri::command]
async fn get_user_in_db_by_initial(
    initial_code: String,
    mysql_pool: State<'_, Pool>,
) -> Result<User, ()> {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");
    let query =
        "SELECT nim, bn_number, name, major, initial, role FROM msuser WHERE initial = :initial";
    let result2: Option<(String, String, String, String, Option<String>, String)> = conn
        .exec_first(
            query,
            params! {
                "initial" => initial_code,
            },
        )
        .expect("Failed to execute query");

    if let Some((nim, bn_number, name, major, initial, role)) = result2 {
        let user: User = User {
            bn_number: cynic::Id::new(bn_number),
            initial: initial,
            major: major,
            name: name,
            nim: nim,
            role: role,
        };
        return Ok(user);
    } else {
        return Err(());
    }
}

#[tauri::command]
async fn get_all_user_in_db(mysql_pool: State<'_, Pool>) -> Result<Vec<User>, ()> {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");

    let res = conn
        .query_map(
            format!("SELECT bn_number, name, major, role, initial, nim FROM msuser"),
            |(bn_number, name, major, role, initial, nim): (
                String,
                String,
                String,
                String,
                Option<String>,
                String,
            )|
             -> User {
                User {
                    bn_number: cynic::Id::new(bn_number),
                    name,
                    nim,
                    major,
                    role,
                    initial,
                }
            },
        )
        .expect("Failed to execute Query");

    Ok(res)
}

#[tauri::command]
fn authenticate_in_db_by_nim(
    nim_code: String,
    input_password: String,
    mysql_pool: State<Pool>,
) -> bool {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");
    let query = "SELECT password FROM msuser WHERE nim = :nim";
    let result: Option<String> = conn
        .exec_first(
            query,
            params! {
                "nim" => nim_code
            },
        )
        .expect("lollll");

    if let Some(pw) = result {
        if verify(input_password, pw.as_str()).unwrap() {
            return true;
        } else {
            return false;
        }
    } else {
        return false;
    }
}

#[tauri::command]
fn find_user_in_db_by_initial(initial_code: String, mysql_pool: State<Pool>) -> bool {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");
    let query = "SELECT initial FROM msuser WHERE initial = :initial";
    let result2: Option<(String)> = conn
        .exec_first(
            query,
            params! {
                "initial" => initial_code,
            },
        )
        .expect("Failed to execute query");

    if let Some(result) = result2 {
        return true;
    } else {
        return false;
    }
}

#[tauri::command]
fn authenticate_in_db_by_initial(
    initial_code: String,
    input_password: String,
    mysql_pool: State<Pool>,
) -> bool {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");
    let query = "SELECT password FROM msuser WHERE initial = :initial";
    let result: Option<(String)> = conn
        .exec_first(
            query,
            params! {
                "initial" => initial_code
            },
        )
        .expect("lollll");

    if let Some(pw) = result {
        if verify(input_password, pw.as_str()).unwrap() {
            return true;
        } else {
            return false;
        }
    } else {
        return false;
    }
}

#[tauri::command]
fn change_password(nim_code: &str, input_password: &str, mysql_pool: State<Pool>) -> bool {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");
    let query = "UPDATE msuser SET password= :password WHERE nim= :nim";
    let hash_password = hashing(input_password);

    let result = conn
        .exec_drop(
            query,
            params! {
                "password" => hash_password,
                "nim" => nim_code
            },
        )
        .expect("LOLLL");

    return true;
}

#[tauri::command]
fn edit_user(
    nim_code: &str,
    input_role: String,
    input_initial: Option<String>,
    mysql_pool: State<Pool>,
) -> bool {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");
    let query = "UPDATE msuser SET role= :role, initial= :initial WHERE nim= :nim";

    let result = conn
        .exec_drop(
            query,
            params! {
                "role" => input_role,
                "nim" => nim_code,
                "initial" => input_initial
            },
        )
        .expect("LOLLL");

    return true;
}

struct CurrentUser {
    user: Mutex<Option<User>>,
}

#[tauri::command]
fn set_current_user(
    current_user: State<CurrentUser>,
    nim: String,
    bn_number: &str,
    name: String,
    major: String,
    user_initial: Option<String>,
    role: String,
) -> bool {
    let user: Option<User> = Some(User {
        bn_number: bn_number.into(),
        nim: nim,
        name: name,
        major: major,
        initial: user_initial,
        role: role,
    });
    if let Some(uuser) = user {
        current_user.user.lock().unwrap().replace(uuser);
        return true;
    }
    return false;
}

#[tauri::command]
fn get_current_user(current_user: State<CurrentUser>) -> Option<User> {
    return current_user.user.lock().unwrap().clone();
}

#[tauri::command]
fn remove_current_user(current_user: State<CurrentUser>) {
    current_user.user.lock().unwrap().take();
}

#[derive(cynic::QueryFragment, Debug)]
#[cynic(graphql_type = "Query")]
pub struct GetAllSubjectQuery {
    pub get_all_subject: Vec<Subject>,
}

#[derive(cynic::QueryFragment, Debug, Serialize)]
pub struct Subject {
    #[cynic(rename = "subject_code")]
    pub subject_code: String,
    #[cynic(rename = "subject_name")]
    pub subject_name: String,
}

#[tauri::command]
async fn get_all_subject() -> Result<Vec<Subject>, String> {
    let operation = GetAllSubjectQuery::build(());
    let response = surf::post("https://academic-slc.apps.binus.ac.id/tpa-241/query")
        .run_graphql(operation)
        .await
        .map_err(|err| format!("Failed to fetch user data: {}", err))?;

    if let Some(data) = response.data {
        Ok(data.get_all_subject)
    } else {
        Err("User not found".to_string())
    }
}

#[derive(cynic::QueryVariables, Debug)]
pub struct GetSubjectWithCodeVariables<'a> {
    pub subject_code: &'a str,
}

#[derive(cynic::QueryFragment, Debug)]
#[cynic(graphql_type = "Query", variables = "GetSubjectWithCodeVariables")]
pub struct GetSubjectWithCode {
    #[arguments(subject_code: $subject_code)]
    pub get_subject_by_code: Subject,
}

#[tauri::command]
async fn get_subject_by_code(input_code: String) -> Result<Subject, String> {
    let operation = GetSubjectWithCode::build(GetSubjectWithCodeVariables {
        subject_code: input_code.as_str(),
    });

    let response = surf::post("https://academic-slc.apps.binus.ac.id/tpa-241/query")
        .run_graphql(operation)
        .await
        .map_err(|err| format!("Failed to fetch user data: {}", err))?;

    if let Some(data) = response.data {
        Ok(data.get_subject_by_code)
    } else {
        Err("User not found".to_string())
    }
}

#[derive(cynic::QueryVariables, Debug)]
pub struct GetClassWithSubjectCodeQueryVariables<'a> {
    pub subject_code: &'a str,
}

#[derive(cynic::QueryFragment, Debug)]
#[cynic(
    graphql_type = "Query",
    variables = "GetClassWithSubjectCodeQueryVariables"
)]
pub struct GetClassWithSubjectCodeQuery {
    #[arguments(subject_code: $subject_code)]
    pub get_enrollment_class_code_by_subject_code: Option<Vec<String>>,
}

#[tauri::command]
async fn get_class_by_subject_code(subject_code: String) -> Result<Option<Vec<String>>, String> {
    let operation = GetClassWithSubjectCodeQuery::build(GetClassWithSubjectCodeQueryVariables {
        subject_code: subject_code.as_str(),
    });

    let response = surf::post("https://academic-slc.apps.binus.ac.id/tpa-241/query")
        .run_graphql(operation)
        .await
        .map_err(|err| format!("Failed to fetch user data: {}", err))?;

    if let Some(data) = response.data {
        Ok(data.get_enrollment_class_code_by_subject_code)
    } else {
        Err("User not found".to_string())
    }
}

#[derive(cynic::QueryFragment, Debug)]
#[cynic(graphql_type = "Query")]
pub struct GetAllRoomQuery {
    pub get_all_room: Vec<Room>,
}

#[derive(cynic::QueryFragment, Debug, Serialize)]
pub struct Room {
    pub campus: String,
    #[cynic(rename = "room_capacity")]
    pub room_capacity: i32,
    #[cynic(rename = "room_number")]
    pub room_number: String,
}

#[tauri::command]
async fn get_all_room() -> Result<Vec<Room>, String> {
    let operation = GetAllRoomQuery::build(());
    let response = surf::post("https://academic-slc.apps.binus.ac.id/tpa-241/query")
        .run_graphql(operation)
        .await
        .map_err(|err| format!("Failed to fetch user data: {}", err))?;

    if let Some(data) = response.data {
        Ok(data.get_all_room)
    } else {
        Err("User not found".to_string())
    }
}

#[tauri::command]
fn find_transaction_by_room_and_shift(
    room_code: String,
    inputed_date: String,
    shift_code: i32,
    mysql_pool: State<Pool>,
) -> bool {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");
    let query = "SELECT transactionid FROM transactionheader WHERE room = :room AND shift= :shift AND transaction_date = :date";
    let result2: Option<(i32)> = conn
        .exec_first(
            query,
            params! {
                "room" => room_code,
                "shift" => shift_code,
                "date" => inputed_date
            },
        )
        .expect("Failed to execute query");

    if let Some(result) = result2 {
        return true;
    } else {
        return false;
    }
}

#[tauri::command]
fn get_transactionid_by_room_and_shift(
    room_code: String,
    inputed_date: String,
    shift_code: i32,
    mysql_pool: State<Pool>,
) -> i32 {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");
    let query = "SELECT transactionid FROM transactionheader WHERE room = :room AND shift= :shift AND transaction_date = :date";
    let result2: Option<(i32)> = conn
        .exec_first(
            query,
            params! {
                "room" => room_code,
                "shift" => shift_code,
                "date" => inputed_date
            },
        )
        .expect("Failed to execute query");

    if let Some(result) = result2 {
        return result;
    } else {
        return 0;
    }
}

#[derive(cynic::QueryVariables, Debug)]
pub struct GetStudentsBySubjectAndClassQueryVariables<'a> {
    pub class_code: &'a str,
    pub subject_code: &'a str,
}

#[derive(cynic::QueryFragment, Debug)]
#[cynic(
    graphql_type = "Query",
    variables = "GetStudentsBySubjectAndClassQueryVariables"
)]
pub struct GetStudentsBySubjectAndClassQuery {
    #[arguments(class_code: $class_code, subject_code: $subject_code)]
    pub get_students_by_class_and_subject_code: Option<Vec<String>>,
}
// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
async fn get_students_by_class_and_subject_code(
    subject_code: String,
    input_code: Vec<String>,
) -> Result<Option<Vec<String>>, String> {
    let mut all_students: Vec<String> = Vec::new();

    for code in &input_code {
        let operation =
            GetStudentsBySubjectAndClassQuery::build(GetStudentsBySubjectAndClassQueryVariables {
                subject_code: subject_code.as_str(),
                class_code: code.as_str(),
            });
        let response = surf::post("https://academic-slc.apps.binus.ac.id/tpa-241/query")
            .run_graphql(operation)
            .await
            .map_err(|err| format!("Failed to fetch user data: {}", err))?;

        if let Some(data) = response.data {
            if let Some(students) = data.get_students_by_class_and_subject_code {
                all_students.extend(students)
            }
        }
    }
    if !all_students.is_empty() {
        Ok(Some(all_students))
    } else {
        Ok(None) // Return None if no students were found
    }
}

#[tauri::command]
async fn get_student_by_nim_and_subject(
    nim_codes: Vec<String>,
    subject_code: String,
    mysql_pool: State<'_, Pool>,
) -> Result<Option<Vec<String>>, ()> {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");
    let query = "SELECT td.student_nim FROM transactiondetail td JOIN transactionheader th ON td.transactionid = th.transactionid WHERE td.student_nim = :nim AND th.subject_code = :subjectcode";

    let mut clash_nims = Vec::new();

    for nim_code in nim_codes {
        let result2: Option<(String)> = conn
            .exec_first(
                query,
                params! {
                    "nim" => nim_code,
                    "subjectcode" => subject_code.clone(),
                },
            )
            .expect("Failed to execute query");

        if let Some(nim) = result2 {
            clash_nims.push(nim);
        }
    }

    Ok(Some(clash_nims))
}

#[tauri::command]
async fn get_student_by_nim_and_shift(
    nim_codes: Vec<String>,
    shift_code: i32,
    inputed_date: String,
    mysql_pool: State<'_, Pool>,
) -> Result<Option<Vec<String>>, ()> {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");
    let query = "SELECT td.student_nim FROM transactiondetail td JOIN transactionheader th ON td.transactionid = th.transactionid WHERE td.student_nim = :nim AND th.shift =:shift AND DATE(th.transaction_date) = :date";

    let mut clash_nims = Vec::new();

    for nim_code in nim_codes {
        let result2: Option<(String)> = conn
            .exec_first(
                query,
                params! {
                    "nim" => nim_code,
                    "shift" => shift_code,
                    "date" => inputed_date.clone(),
                },
            )
            .expect("Failed to execute query");

        if let Some(nim) = result2 {
            clash_nims.push(nim);
        }
    }

    Ok(Some(clash_nims))
}

#[derive(cynic::QueryVariables, Debug)]
pub struct GetRoomCapacityVariables<'a> {
    pub room_number: &'a str,
}

#[derive(cynic::QueryFragment, Debug)]
#[cynic(graphql_type = "Query", variables = "GetRoomCapacityVariables")]
pub struct GetRoomCapacity {
    #[arguments(room_number: $room_number)]
    pub get_room_by_number: Room,
}

#[tauri::command]
async fn get_room_capacity_by_number(input_number: String) -> Result<Room, ()> {
    let operation = GetRoomCapacity::build(GetRoomCapacityVariables {
        room_number: input_number.as_str(),
    });

    let response = surf::post("https://academic-slc.apps.binus.ac.id/tpa-241/query")
        .run_graphql(operation)
        .await
        .unwrap();

    Ok(response.data.unwrap().get_room_by_number)
}

#[derive(Debug, Serialize, Clone)]
pub struct StudentMapping {
    pub success_group: Option<Vec<String>>,
    pub failed_group: Option<Vec<String>>,
}

#[tauri::command]
async fn student_mapping(
    nim_codes: Vec<String>,
    eliminated1_nim_codes: Option<Vec<String>>,
    eliminated2_nim_codes: Option<Vec<String>>,
    capacity: i32,
) -> Result<StudentMapping, String> {
    let eliminated1_set: HashSet<String> = eliminated1_nim_codes
        .unwrap_or_else(|| vec![])
        .into_iter()
        .collect();

    let eliminated2_set: HashSet<String> = eliminated2_nim_codes
        .unwrap_or_else(|| vec![])
        .into_iter()
        .collect();

    let filtered_nim_codes: Vec<String> = nim_codes
        .into_iter()
        .filter(|nim| !eliminated1_set.contains(nim) && !eliminated2_set.contains(nim))
        .collect();

    if filtered_nim_codes.is_empty() {
        return Err("No valid nim_codes remaining after elimination".to_string());
    }

    let mut success_group = Vec::new();
    let mut failed_group = Vec::new();
    let mut count = 1;
    for nim in filtered_nim_codes {
        if (count < capacity) {
            success_group.push(nim)
        } else {
            failed_group.push(nim)
        }
        count += 1;
    }
    let student_mapping_result = StudentMapping {
        success_group: if success_group.is_empty() {
            None
        } else {
            Some(success_group)
        },
        failed_group: if failed_group.is_empty() {
            None
        } else {
            Some(failed_group)
        },
    };

    Ok(student_mapping_result)
}

#[tauri::command]
async fn change_nim_to_user(
    nim_codes: Option<Vec<String>>,
    mysql_pool: State<'_, Pool>,
) -> Result<Option<Vec<User>>, String> {
    if let Some(nim_codes) = nim_codes {
        let mut collection_of_user = filter_user(mysql_pool).await.unwrap();
        let mut users_collection: Vec<User> = Vec::new();

        for nim in nim_codes {
            for user in &collection_of_user {
                if user.nim == nim {
                    users_collection.push(user.clone());
                    break;
                }
            }
        }

        if !users_collection.is_empty() {
            Ok(Some(users_collection))
        } else {
            Ok(None)
        }
    } else {
        Ok(None)
    }
}

#[tauri::command]
fn add_transaction_header(
    mysql_pool: State<Pool>,
    subject_code: String,
    subject_name: String,
    room_code: String,
    inputed_date: String,
    input_shift: i32,
) -> bool {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");
    let query = "INSERT INTO transactionheader(subject_code, room, transaction_date, transaction_time, transaction_end, shift, transaction_status, subject_name) VALUES (:subject_code, :room_code, :date, :time_start, :time_end, :shift, :status, :subjectname)";

    let mut input_time_start: String;
    let mut input_time_end: String;

    let mut input_time_start: String = String::new();
    let mut input_time_end: String = String::new();

    if input_shift == 1 {
        input_time_start = format!("{} 07:20:00", inputed_date);
        input_time_end = format!("{} 09:00:00", inputed_date);
    } else if input_shift == 2 {
        input_time_start = format!("{} 09:20:00", inputed_date);
        input_time_end = format!("{} 11:00:00", inputed_date);
    } else if input_shift == 3 {
        input_time_start = format!("{} 11:20:00", inputed_date);
        input_time_end = format!("{} 13:00:00", inputed_date);
    } else if input_shift == 4 {
        input_time_start = format!("{} 13:20:00", inputed_date);
        input_time_end = format!("{} 15:00:00", inputed_date);
    } else if input_shift == 5 {
        input_time_start = format!("{} 15:20:00", inputed_date);
        input_time_end = format!("{} 17:00:00", inputed_date);
    } else if input_shift == 6 {
        input_time_start = format!("{} 17:20:00", inputed_date);
        input_time_end = format!("{} 19:00:00", inputed_date);
    } else {
        input_time_start = format!("{} 19:20:00", inputed_date);
        input_time_end = format!("{} 21:00:00", inputed_date);
    }

    let result = conn.exec_drop(
        query,
        params! {
            "subject_code" =>subject_code,
            "room_code" => room_code,
            "date" => inputed_date,
            "time_start" => input_time_start,
            "time_end" => input_time_end,
            "shift" => input_shift,
            "status" => 3,
            "subjectname" => subject_name,
        },
    );
    return true;
}

use async_std::task;

fn get_user_by_nim_sync(nim_code: String) -> Result<Option<User>, String> {
    async_std::task::block_on(get_user_by_nim(nim_code))
}

#[tauri::command]
fn add_student_to_transaction(
    mysql_pool: State<Pool>,
    transaction_id: i32,
    nim_codes: Vec<String>,
) -> bool {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");
    let query = "INSERT INTO transactiondetail(transactionid, student_nim, student_name, seat_number) VALUES(:id, :nim, :name, :seat)";

    let mut count = 1;

    for nim_code in nim_codes {
        let user = match get_user_by_nim_sync(nim_code.clone()) {
            Ok(Some(user)) => user,
            Ok(None) => {
                eprintln!("User not found for NIM: {}", nim_code);
                return false;
            }
            Err(err) => {
                eprintln!("Error fetching user for NIM {}: {}", nim_code, err);
                return false;
            }
        };
        let result = conn.exec_drop(
            query,
            params! {
                "id" => transaction_id,
                "nim" => user.nim,
                "name" => user.name,
                "seat" => count,
            },
        );
        if let Err(err) = result {
            eprintln!("Error inserting record: {}", err);
            return false;
        }
        count += 1;
    }

    return true;
}
#[derive(Debug, Serialize, Clone)]
pub struct TransactionForAssitant {
    pub transaction_id: i32,
    pub subject_code: String,
    pub subject_name: String,
    pub room_number: String,
    pub transaction_date: String,
    pub transaction_shift: i32,
}

#[tauri::command]
async fn get_all_transactions_that_not_yet_have_assistant(
    mysql_pool: State<'_, Pool>,
) -> Result<Option<Vec<TransactionForAssitant>>, ()> {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");

    let res = conn
        .query_map(
            format!("SELECT transactionid, subject_code, subject_name, room, transaction_date, shift FROM transactionheader WHERE proctoring_assistant IS NULL"),
            |(transaction_id, subject_code,subject_name, room_number, transaction_date, shift): (
                i32,
                String,
                String,
                String,
                String,
                i32,
            )|
             -> TransactionForAssitant {
                TransactionForAssitant {
                    transaction_id,
                    subject_code,
                    subject_name,
                    room_number,
                    transaction_date,
                    transaction_shift: shift,
                }
            },
        )
        .expect("Failed to execute Query");

    Ok(Some(res))
}

#[tauri::command]
async fn get_transaction_by_id(
    mysql_pool: State<'_, Pool>,
    transaction_id: i32,
) -> Result<TransactionForAssitant, ()> {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");
    let query =
        "SELECT transactionid, subject_code, subject_name, room, CAST(transaction_date AS CHAR), shift FROM transactionheader WHERE transactionid= :transid ";
    let result2: Option<(i32, String, String, String, String, i32)> = conn
        .exec_first(
            query,
            params! {
                "transid" => transaction_id,
            },
        )
        .expect("Failed to execute query");

    if let Some((rtransid, rsubjectcode, rsubjectname, rromm, rdate, rshift)) = result2 {
        let transaction: TransactionForAssitant = TransactionForAssitant {
            transaction_id: rtransid,
            subject_code: rsubjectcode,
            subject_name: rsubjectname,
            room_number: rromm,
            transaction_date: rdate,
            transaction_shift: rshift,
        };
        return Ok(transaction);
    } else {
        return Err(());
    }
}

#[tauri::command]
async fn get_transaction_by_user_and_subject(
    initial_codes: Vec<User>,
    subject_code: String,
    mysql_pool: State<'_, Pool>,
) -> Result<Option<Vec<String>>, ()> {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");
    let query = "SELECT proctoring_assistant FROM transactionheader WHERE proctoring_assistant = :assistant AND LEFT(subject_code, 7) = LEFT(:subject_code , 7)";

    let mut clash_nims = Vec::new();

    for initial in initial_codes {
        let result2: Option<(String)> = conn
            .exec_first(
                query,
                params! {
                    "assistant" => initial.initial,
                    "subject_code" => subject_code.clone(),
                },
            )
            .expect("Failed to execute query");

        if let Some(nim) = result2 {
            clash_nims.push(nim);
        }
    }

    Ok(Some(clash_nims))
}

#[tauri::command]
async fn get_transaction_by_user_initial_and_shift(
    initial_codes: Vec<User>,
    shift_code: i32,
    inputed_date: String,
    mysql_pool: State<'_, Pool>,
) -> Result<Option<Vec<String>>, ()> {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");
    let query = "SELECT proctoring_assistant FROM transactionheader WHERE proctoring_assistant = :assistant AND shift =:shift AND DATE(transaction_date) = :date";

    let mut clash_nims = Vec::new();

    for initial in initial_codes {
        let result2: Option<(String)> = conn
            .exec_first(
                query,
                params! {
                    "assistant" => initial.initial,
                    "shift" => shift_code,
                    "date" => inputed_date.clone(),
                },
            )
            .expect("Failed to execute query");

        if let Some(nim) = result2 {
            clash_nims.push(nim);
        }
    }

    Ok(Some(clash_nims))
}

#[tauri::command]
async fn allocate_assistant(
    selected_assistant: Vec<User>,
    eliminated1_nim_codes: Option<Vec<String>>,
    eliminated2_initial_codes: Option<Vec<String>>,
    eliminated3_nim_codes: Option<Vec<String>>,
    eliminated4_initial_codes: Option<Vec<String>>,
) -> Result<Vec<User>, String> {
    let eliminated1_nims: Vec<String> = eliminated1_nim_codes.unwrap_or_default();

    let filtered1_assistants: Vec<User> = selected_assistant
        .into_iter()
        .filter(|assistant| !eliminated1_nims.contains(&assistant.nim))
        .collect();

    if !filtered1_assistants.is_empty() {
        let eliminated3_nims: Vec<String> = eliminated3_nim_codes.unwrap_or_default();

        let filtered2_assistants: Vec<User> = filtered1_assistants
            .into_iter()
            .filter(|assistant| !eliminated3_nims.contains(&assistant.nim))
            .collect();

        if !filtered2_assistants.is_empty() {
            let eliminated2_initial: Vec<String> = eliminated2_initial_codes.unwrap_or_default();

            let filtered3_assistants: Vec<User> = filtered2_assistants
                .into_iter()
                .filter(|assistant| {
                    assistant.initial.is_some()
                        && !eliminated2_initial.contains(&assistant.initial.as_ref().unwrap())
                })
                .collect();

            if !filtered3_assistants.is_empty() {
                let eliminated4_initial: Vec<String> =
                    eliminated4_initial_codes.unwrap_or_default();

                let filtered4_assistants: Vec<User> = filtered3_assistants
                    .into_iter()
                    .filter(|assistant| {
                        assistant.initial.is_some()
                            && !eliminated4_initial.contains(&assistant.initial.as_ref().unwrap())
                    })
                    .collect();

                if !filtered4_assistants.is_empty() {
                    Ok(filtered4_assistants)
                } else {
                    Err("No suitable assistant available".to_string())
                }
            } else {
                Err("No suitable assistant available".to_string())
            }
        } else {
            Err("No suitable assistant available".to_string())
        }
    } else {
        Err("No suitable assistant available".to_string())
    }
}

#[tauri::command]
async fn selecting_assistance(
    assistant_list: Vec<User>,
    transaction_id: i32,
    mysql_pool: State<'_, Pool>,
) -> Result<User, String> {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");
    let query = "SELECT COUNT(*) FROM transactionheader WHERE proctoring_assistant = :initial";

    let mut minimal = std::i32::MAX;
    let mut least_assistant: Option<User> = None;

    for assistant in assistant_list {
        let result: Option<i32> = conn
            .exec_first(query, params! { "initial" => assistant.initial.clone() })
            .expect("Failed to execute query");

        if let Some(count) = result {
            if count < minimal {
                minimal = count;
                least_assistant = Some(assistant);
            }
        }
    }

    if let Some(assistant) = least_assistant {
        let assistant_initial = assistant.initial.clone().unwrap_or_default();

        let query2 = "UPDATE transactionheader SET proctoring_assistant = :assistant WHERE transactionid = :id";
        let result = conn.exec_drop(
            query2,
            params! {
                "assistant" => assistant_initial,
                "id" =>transaction_id,
            },
        );
        Ok(assistant)
    } else {
        Err("No suitable assistant found".into())
    }
}

#[tauri::command]
fn delete_proctoring_asssistant(transaction_code: Vec<i32>, mysql_pool: State<Pool>) -> bool {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");
    let query2 =
        "UPDATE transactionheader SET proctoring_assistant = NULL WHERE transactionid = :id";
    for id in transaction_code {
        let result = conn.exec_drop(
            query2,
            params! {
                "id" =>id,
            },
        );
    }
    return true;
}

#[derive(Debug, Serialize, Clone)]
pub struct TransactionForStudent {
    pub transaction_id: i32,
    pub subject_code: String,
    pub subject_name: String,
    pub room_number: String,
    pub transaction_date: String,
    pub transaction_start: String,
    pub transaction_end: String,
    pub seat_number: i32,
}

#[tauri::command]
async fn get_student_transaction_by_nim(
    nim_code: String,
    mysql_pool: State<'_, Pool>,
) -> Result<Option<Vec<TransactionForStudent>>, ()> {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");

    let res = conn
        .query_map(
            format!("SELECT th.transactionid, th.subject_code, th.subject_name, th.room, CONCAT(DATE_FORMAT(th.transaction_date, '%W, '), DATE_FORMAT(th.transaction_date, '%d '),  DATE_FORMAT(th.transaction_date, '%M %Y')), DATE_FORMAT(th.transaction_time, '%H:%i:%s'), DATE_FORMAT(th.transaction_end + INTERVAL td.extend_time MINUTE, '%H:%i:%s'), td.seat_number FROM transactiondetail td JOIN transactionheader th ON td.transactionid = th.transactionid WHERE td.student_nim = {} AND TIMESTAMP(th.transaction_end) >= NOW() AND th.proctoring_assistant IS NOT NULL", nim_code),
            |(transaction_id, subject_code,subject_name, room_number, transaction_date, transaction_start, transaction_end, seat_number): (
                i32,
                String,
                String,
                String,
                String,
                String,
                String,
                i32,
            )|
             -> TransactionForStudent {
                TransactionForStudent {
                    transaction_id,
                    subject_code,
                    subject_name,
                    room_number,
                    transaction_start,
                    transaction_end,
                    transaction_date,
                    seat_number,
                }
            },
        )
        .expect("Failed to execute Query");

    Ok(Some(res))
}

#[derive(Debug, Serialize, Clone)]
pub struct TransactionForOtherRole {
    pub transaction_id: i32,
    pub subject_code: String,
    pub subject_name: String,
    pub room_number: String,
    pub transaction_date: String,
    pub transaction_start: String,
    pub transaction_end: String,
    pub initial: Option<String>,
    pub status: i32,
}

#[tauri::command]
async fn get_assistant_transaction_by_initial(
    initial_code: String,
    mysql_pool: State<'_, Pool>,
) -> Result<Option<Vec<TransactionForOtherRole>>, ()> {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");

    let res = conn
        .query_map(
            format!("SELECT transactionid, subject_code, subject_name, room, CONCAT(DATE_FORMAT(transaction_date, '%W, '), DATE_FORMAT(transaction_date, '%d '),  DATE_FORMAT(transaction_date, '%M %Y')), DATE_FORMAT(transaction_time, '%H:%i:%s'), DATE_FORMAT(transaction_end, '%H:%i:%s'), proctoring_assistant, status FROM transactionheader WHERE proctoring_assistant = \'{}\' ", initial_code),
            |(transaction_id, subject_code,subject_name, room_number, transaction_date, transaction_start, transaction_end, initial, status): (
                i32,
                String,
                String,
                String,
                String,
                String,
                String,
                Option<String>,
                i32,
            )|
             -> TransactionForOtherRole {
                TransactionForOtherRole {
                    transaction_id,
                    subject_code,
                    subject_name,
                    room_number,
                    transaction_date,
                    transaction_start,
                    transaction_end,
                    initial,
                    status
                }
            },
        )
        .expect("Failed to execute Query");

    Ok(Some(res))
}

#[tauri::command]
async fn get_all_transactions(
    mysql_pool: State<'_, Pool>,
) -> Result<Option<Vec<TransactionForOtherRole>>, ()> {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");

    let res = conn
        .query_map(
            format!("SELECT transactionid, subject_code, subject_name, room, CONCAT(DATE_FORMAT(transaction_date, '%W, '), DATE_FORMAT(transaction_date, '%d '),  DATE_FORMAT(transaction_date, '%M %Y')), DATE_FORMAT(transaction_time, '%H:%i:%s'), DATE_FORMAT(transaction_end, '%H:%i:%s'), proctoring_assistant, status FROM transactionheader WHERE proctoring_assistant IS NOT NULL "),
            |(transaction_id, subject_code,subject_name, room_number, transaction_date, transaction_start, transaction_end, initial, status): (
                i32,
                String,
                String,
                String,
                String,
                String,
                String,
                Option<String>,
                i32,
            )|
             -> TransactionForOtherRole {
                TransactionForOtherRole {
                    transaction_id,
                    subject_code,
                    subject_name,
                    room_number,
                    transaction_date,
                    transaction_start,
                    transaction_end,
                    initial,
                    status
                }
            },
        )
        .expect("Failed to execute Query");

    Ok(Some(res))
}

#[tauri::command]
async fn get_all_room_transaction_by_date(
    inputed_date: String,
    mysql_pool: State<'_, Pool>,
) -> Result<Option<Vec<TransactionForOtherRole>>, ()> {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");

    let res = conn
        .query_map(
            format!("SELECT transactionid, subject_code, subject_name, room, CONCAT(DATE_FORMAT(transaction_date, '%W, '), DATE_FORMAT(transaction_date, '%d '),  DATE_FORMAT(transaction_date, '%M %Y')), DATE_FORMAT(transaction_time, '%H:%i:%s'), DATE_FORMAT(transaction_end, '%H:%i:%s'), proctoring_assistant, status FROM transactionheader WHERE transaction_date = \'{}\' ", inputed_date),
            |(transaction_id, subject_code,subject_name, room_number, transaction_date, transaction_start, transaction_end, initial, status): (
                i32,
                String,
                String,
                String,
                String,
                String,
                String,
                Option<String>,
                i32,
            )|
             -> TransactionForOtherRole {
                TransactionForOtherRole {
                    transaction_id,
                    subject_code,
                    subject_name,
                    room_number,
                    transaction_date,
                    transaction_start,
                    transaction_end,
                    initial,
                    status
                }
            },
        )
        .expect("Failed to execute Query");

    Ok(Some(res))
}

#[tauri::command]
async fn get_transactions_by_room_and_date(
    room_number: String,
    inputed_date: String,
    mysql_pool: State<'_, Pool>,
) -> Result<Option<Vec<TransactionForOtherRole>>, ()> {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");

    let res = conn
        .query_map(
            format!("SELECT transactionid, subject_code, subject_name, room, CONCAT(DATE_FORMAT(transaction_date, '%W, '), DATE_FORMAT(transaction_date, '%d '),  DATE_FORMAT(transaction_date, '%M %Y')), DATE_FORMAT(transaction_time, '%H:%i:%s'), DATE_FORMAT(transaction_end, '%H:%i:%s'), proctoring_assistant, status FROM transactionheader WHERE room = \'{}\' AND DATE(transaction_date) = \'{}\'", room_number, inputed_date),
            |(transaction_id, subject_code,subject_name, room_number, transaction_date, transaction_start, transaction_end, initial, status): (
                i32,
                String,
                String,
                String,
                String,
                String,
                String,
                Option<String>,
                i32,
            )|
             -> TransactionForOtherRole {
                TransactionForOtherRole {
                    transaction_id,
                    subject_code,
                    subject_name,
                    room_number,
                    transaction_date,
                    transaction_start,
                    transaction_end,
                    initial,
                    status
                }
            },
        )
        .expect("Failed to execute Query");

    Ok(Some(res))
}

#[tauri::command]
async fn get_transactions_by_date(
    room_numbers: Vec<Room>,
    inputed_date: String,
    mysql_pool: State<'_, Pool>,
) -> Result<Option<Vec<TransactionForOtherRole>>, ()> {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");

    let mut transactions = Vec::new(); // Vector to collect transactions

    for room_number in room_numbers {
        let query = format!(
            "SELECT transactionid, subject_code, subject_name, room, \
             CONCAT(DATE_FORMAT(transaction_date, '%W, %d %M %Y')), \
             DATE_FORMAT(transaction_time, '%H:%i:%s'), \
             DATE_FORMAT(transaction_end, '%H:%i:%s'), proctoring_assistant, status \
             FROM transactionheader \
             WHERE room = '{}' AND DATE(transaction_date) = '{}'",
            room_number.room_number, inputed_date
        );

        let result = conn
            .query_map(
                query,
                |(
                    transaction_id,
                    subject_code,
                    subject_name,
                    room_number,
                    transaction_date,
                    transaction_start,
                    transaction_end,
                    initial,
                    status,
                )| {
                    TransactionForOtherRole {
                        transaction_id,
                        subject_code,
                        subject_name,
                        room_number,
                        transaction_date,
                        transaction_start,
                        transaction_end,
                        initial,
                        status,
                    }
                },
            )
            .map_err(|err| {
                eprintln!("Error executing query: {:?}", err);
            });

        match result {
            Ok(mapped_transactions) => {
                transactions.extend(mapped_transactions); // Collect mapped transactions
            }
            Err(_) => {
                // Handle query execution error
                return Err(());
            }
        }
    }

    // Return collected transactions as Option<Vec<TransactionForOtherRole>>
    Ok(Some(transactions))
}

#[tauri::command]
async fn get_transaction_for_other_role_by_id(
    transaction_id: String,
    mysql_pool: State<'_, Pool>,
) -> Result<Option<TransactionForOtherRole>, ()> {
    let mut conn = match mysql_pool.get_conn() {
        Ok(conn) => conn,
        Err(err) => {
            eprintln!("Failed to get connection: {:?}", err);
            return Err(());
        }
    };

    let query = format!(
        "SELECT transactionid, subject_code, subject_name, room, \
             CONCAT(DATE_FORMAT(transaction_date, '%W, %d %M %Y')), \
             DATE_FORMAT(transaction_time, '%H:%i:%s'), \
             DATE_FORMAT(transaction_end, '%H:%i:%s'), proctoring_assistant, status \
             FROM transactionheader \
             WHERE transactionID = '{}'",
        transaction_id
    );

    let result: Result<Option<TransactionForOtherRole>, mysql::Error> =
        conn.query_first(query).map(|row| {
            row.map(
                |(
                    transaction_id,
                    subject_code,
                    subject_name,
                    room_number,
                    transaction_date,
                    transaction_start,
                    transaction_end,
                    initial,
                    status,
                )| {
                    TransactionForOtherRole {
                        transaction_id,
                        subject_code,
                        subject_name,
                        room_number,
                        transaction_date,
                        transaction_start,
                        transaction_end,
                        initial,
                        status,
                    }
                },
            )
        });

    match result {
        Ok(transaction) => Ok(transaction),
        Err(err) => {
            eprintln!("Error executing query: {:?}", err);
            Err(())
        }
    }
}

#[derive(Debug, Serialize, Clone)]
pub struct StudentDetails {
    pub transaction_id: i32,
    pub student_nim: String,
    pub student_name: String,
    pub seat_number: i32,
    pub submission_status: String,
    pub offense: i32,
}

#[tauri::command]
async fn get_student_by_transaction_id(
    mysql_pool: State<'_, Pool>,
    transaction_id: String,
) -> Result<Vec<StudentDetails>, ()> {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");

    let query = format!(
        "SELECT transactionid, student_nim, student_name, seat_number, submission_status, offense FROM transactiondetail WHERE transactionid = '{}'", transaction_id
    );

    let res = conn
        .query_map(
            query,
            |(
                transaction_id,
                student_nim,
                student_name,
                seat_number,
                submission_status,
                offense,
            ): (i32, String, String, i32, String, i32)|
             -> StudentDetails {
                StudentDetails {
                    transaction_id,
                    student_nim,
                    student_name,
                    seat_number,
                    submission_status,
                    offense,
                }
            },
        )
        .expect("Failed to execute Query");

    Ok(res)
}

#[tauri::command]
fn change_seat(
    transaction_id: i32,
    nim_code: &str,
    seat_number: i32,
    mysql_pool: State<Pool>,
) -> bool {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");
    let query = "UPDATE transactiondetail SET seat_number= :role WHERE student_nim= :nim AND transactionid = :id";

    let result = conn
        .exec_drop(
            query,
            params! {
                "role" => seat_number,
                "nim" => nim_code,
                "id" =>transaction_id,
            },
        )
        .expect("LOLLL");

    return true;
}

#[tauri::command]
fn add_transaction_notes(transaction_id: i32, notes: String, mysql_pool: State<Pool>) -> bool {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");

    let query = "INSERT INTO msnote (transaction_id, description) \
         VALUES (:id, :note)";

    let result = conn.exec_drop(
        query,
        params! {
            "id" => transaction_id,
            "note" => notes
        },
    );

    return true;
}

#[tauri::command]
async fn get_transaction_notes(
    mysql_pool: State<'_, Pool>,
    transaction_id: i32,
) -> Result<Option<Vec<TransactionNotes>>, ()> {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");

    let query = format!(
        "SELECT note_id, transaction_id, description FROM msnote WHERE transaction_id = '{}'",
        transaction_id
    );

    let res = conn
        .query_map(
            query,
            |(note_id, transaction_id, description): (i32, i32, String)| -> TransactionNotes {
                TransactionNotes {
                    note_id,
                    transaction_id,
                    description,
                }
            },
        )
        .expect("Failed to execute Query");

    Ok(Some(res))
}

#[derive(Debug, Serialize, Clone)]
pub struct TransactionNotes {
    pub note_id: i32,
    pub transaction_id: i32,
    pub description: String,
}

#[tauri::command]
fn add_time_extension_for_class(
    transaction_id: i32,
    update_query: &str,
    mysql_pool: State<Pool>,
) -> bool {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");
    let query = "UPDATE transactionheader SET transaction_end = transaction_end + INTERVAL :minute MINUTE WHERE transactionid = :id";

    let result = conn
        .exec_drop(
            query,
            params! {
                "minute" => update_query,
                "id" =>transaction_id,
            },
        )
        .expect("LOLLL");

    return true;
}

#[tauri::command]
fn add_time_extension_for_student(
    transaction_id: i32,
    nim_code: String,
    minute: i32,
    mysql_pool: State<Pool>,
) -> bool {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");
    let query = "UPDATE transactiondetail SET extend_time = extend_time + :minute WHERE transactionid = :id AND student_nim = :nim";

    let result = conn
        .exec_drop(
            query,
            params! {
                "minute" => minute,
                "id" =>transaction_id,
                "nim" => nim_code,
            },
        )
        .expect("LOLLL");

    return true;
}

#[tauri::command]
async fn get_transaction_case(
    mysql_pool: State<'_, Pool>,
    transaction_id: i32,
) -> Result<Option<Vec<u8>>, String> {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection.");
    let res: Option<Vec<u8>> = conn
        .exec_first(
            "SELECT question FROM transactionheader WHERE transactionid = :td",
            params! {
                "td" => transaction_id
            },
        )
        .expect("");

    Ok(res)
}

#[tauri::command]
fn verify_transaction(transaction_id: i32, mysql_pool: State<Pool>) -> bool {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection");
    let query = "UPDATE transactionheader SET status= 1 WHERE transactionid = :id";

    let result = conn
        .exec_drop(
            query,
            params! {
                "id" =>transaction_id,
            },
        )
        .expect("LOLLL");

    return true;
}

#[tauri::command]
async fn upload_case(
    file: Vec<u8>,
    transaction_id: i32,
    mysql_pool: State<'_, Pool>,
) -> Result<bool, String> {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection.");

    let cek = conn.exec_drop(
        "UPDATE transactionheader SET question = :ec WHERE transactionID = :ti",
        params! {
            "ec" => file,
            "ti" => transaction_id
        },
    );

    Ok(true)
}

#[tauri::command]
async fn upload_answer(
    file: Vec<u8>,
    transaction_id: i32,
    student_nim: String,
    mysql_pool: State<'_, Pool>,
) -> Result<bool, String> {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection.");

    let cek = conn.exec_drop(
        "UPDATE transactiondetail SET answer = :ec , submission_status = 'Uploaded' WHERE transactionid = :ti AND student_nim = :nim",
        params! {
            "ec" => file,
            "ti" => transaction_id,
            "nim" => student_nim,
        },
    );

    Ok(true)
}

#[tauri::command]
async fn is_finalize(
    mysql_pool: State<'_, Pool>,
    transaction_id: Option<i32>,
    student_nim: Option<String>,
) -> Result<bool, String> {
    // Check if either transaction_id or student_nim is None
    if transaction_id.is_none() || student_nim.is_none() {
        return Ok(false);
    }

    let mut conn = mysql_pool.get_conn().expect("Failed to get connection.");
    let res: Option<Vec<u8>> = conn
        .exec_first(
            "SELECT student_nim FROM transactiondetail WHERE transactionid = :td AND student_nim = :nim AND submission_status = 'Finalized'",
            params! {
                "td" => transaction_id.unwrap(), // Unwrap the Option<i32> to i32
                "nim" => student_nim.unwrap(),   // Unwrap the Option<String> to String
            },
        )
        .expect("");
    match res {
        Some(_) => Ok(true),
        None => Ok(false),
    }
}

#[tauri::command]
async fn finalize(
    transaction_id: i32,
    student_nim: String,
    mysql_pool: State<'_, Pool>,
) -> Result<bool, String> {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection.");

    let cek = conn.exec_drop(
        "UPDATE transactiondetail SET submission_status = 'Finalized' WHERE transactionid = :ti AND student_nim = :nim",
        params! {
            "ti" => transaction_id,
            "nim" => student_nim,
        },
    );

    Ok(true)
}

#[tauri::command]
async fn get_student_answer(
    mysql_pool: State<'_, Pool>,
    student_nim: String,
    transaction_id: i32,
) -> Result<Option<Vec<u8>>, String> {
    let mut conn = mysql_pool.get_conn().expect("Failed to get connection.");
    let res: Option<Vec<u8>> = conn
        .exec_first(
            "SELECT answer FROM transactiondetail WHERE transactionid = :td AND student_nim = :nim",
            params! {
                "td" => transaction_id,
                "nim" => student_nim,
            },
        )
        .expect("");

    Ok(res)
}

fn main() {
    let mysql_config = MySQLConfig::new(
        "root".to_string(),
        "".to_string(),
        "localhost".to_string(),
        "srexam".to_string(),
    );

    let mysql_url = mysql_config.format_url();
    let pool = Pool::new(&*mysql_url).expect("Failed to create MySQL connection pool");

    let current_user = CurrentUser {
        user: Mutex::new(None),
    };

    tauri::Builder::default()
        .manage(pool)
        .invoke_handler(tauri::generate_handler![
            get_all_user,
            get_user_by_nim,
            get_password_by_nim,
            authenticaton,
            get_user_by_initial,
            add_user_to_database,
            find_user_in_db_by_nim,
            authenticate_in_db_by_nim,
            find_user_in_db_by_initial,
            authenticate_in_db_by_initial,
            set_current_user,
            get_current_user,
            remove_current_user,
            get_all_subject,
            change_password,
            get_user_in_db_by_nim,
            edit_user,
            get_all_user_in_db,
            get_user_in_db_by_initial,
            filter_user,
            get_class_by_subject_code,
            get_all_room,
            find_transaction_by_room_and_shift,
            get_students_by_class_and_subject_code,
            get_student_by_nim_and_subject,
            get_student_by_nim_and_shift,
            student_mapping,
            get_room_capacity_by_number,
            change_nim_to_user,
            get_subject_by_code,
            add_transaction_header,
            get_transactionid_by_room_and_shift,
            add_student_to_transaction,
            get_all_transactions_that_not_yet_have_assistant,
            get_assistant,
            get_transaction_by_id,
            get_transaction_by_user_and_subject,
            get_transaction_by_user_initial_and_shift,
            allocate_assistant,
            selecting_assistance,
            delete_proctoring_asssistant,
            get_student_transaction_by_nim,
            get_assistant_transaction_by_initial,
            get_all_transactions,
            get_transactions_by_room_and_date,
            get_transactions_by_date,
            get_student_by_transaction_id,
            get_transaction_for_other_role_by_id,
            change_seat,
            add_transaction_notes,
            get_transaction_notes,
            add_time_extension_for_class,
            add_time_extension_for_student,
            get_transaction_case,
            verify_transaction,
            upload_case,
            upload_answer,
            get_student_answer,
            finalize,
            is_finalize
        ])
        .manage(current_user)
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
