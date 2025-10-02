import React from "react";
import ReactDOM from "react-dom/client";
import "./styles.css";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import LoginPage from "./Pages/LoginPage";
import HomePage from "./Pages/HomePage";
import SubjectManagementPage from "./Pages/SubjectManagement";
import ProfilePage from "./Pages/ProfilePage";
import UserManagementPage from "./Pages/UserManagementPage";
import ExamSchedulerPage from "./Pages/ExamSchedulerPage";
import AllocateStudentPage from "./Pages/AllocateStudentPage";
import TransactionPage from "./Pages/TransactionPage";
import RoomTransactionPage from "./Pages/RoomTransactionPage";
import TransactionDetailPage from "./Pages/TransactionDetailPage";

const route = createBrowserRouter([
  {
    path: "/",
    element: <LoginPage />
  },
  {
    path: "/Home/Page",
    element: <HomePage />
  },
  {
    path: "/Subject/Management",
    element: <SubjectManagementPage />
  },
  {
    path: "/Profile/Page",
    element: <ProfilePage />
  },
  {
    path: "/User/Management",
    element: <UserManagementPage />
  },
  {
    path: "/Exam/Scheduler/Home",
    element: <ExamSchedulerPage />
  },
  {
    path: "/Exam/Scheduler/Student",
    element: <AllocateStudentPage />
  },
  {
    path: "/Transaction/Page",
    element: <TransactionPage />
  },
  {
    path: "/Room/Transaction",
    element: <RoomTransactionPage />
  },
  {
    path: "/Transaction/Detail/:id",
    element: <TransactionDetailPage />
  }
])

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <RouterProvider router={route}></RouterProvider>
  </React.StrictMode>,
);
