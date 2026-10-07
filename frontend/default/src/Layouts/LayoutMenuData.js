import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getLoggedinUser } from "../helpers/api_helper";

const Navdata = () => {
  const history = useNavigate();

  // Collapsible menu states
  const [isAdminPanel, setIsAdminPanel] = useState(false);
  const [isHospitalPanel, setIsHospitalPanel] = useState(false);
  const [isUserPanel, setIsUserPanel] = useState(false);
  const [iscurrentState, setIscurrentState] = useState("");

  const user = getLoggedinUser();
  const role = user?.role || "user";

  useEffect(() => {
    document.body.classList.remove("twocolumn-panel");
    if (iscurrentState !== "AdminPanel") setIsAdminPanel(false);
    if (iscurrentState !== "HospitalPanel") setIsHospitalPanel(false);
    if (iscurrentState !== "UserPanel") setIsUserPanel(false);
  }, [iscurrentState]);

  const menuItems = [];

  // ==========================================
  // --- ADMIN MENU ITEMS ---
  // ==========================================
  if (role === "admin") {
    menuItems.push(
      {
        label: "ADMINISTRATION",
        isHeader: true,
      },
      {
        id: "dashboard",
        label: "Live Dashboard",
        icon: "ri-dashboard-2-line",
        link: "/dashboard",
        click: function (e) {
          e.preventDefault();
          history("/dashboard");
        },
      },
      {
        id: "adminpanel",
        label: "Admin Management",
        icon: "ri-shield-keyhole-line",
        link: "/#",
        stateVariables: isAdminPanel,
        click: function (e) {
          e.preventDefault();
          setIsAdminPanel(!isAdminPanel);
          setIscurrentState("AdminPanel");
        },
        subItems: [
          {
            id: "ambulances",
            label: "Ambulances",
            link: "/admin/ambulances",
            click: function (e) {
              e.preventDefault();
              history("/admin/ambulances");
            },
          },
          {
            id: "patients",
            label: "Patients",
            link: "/admin/patients",
            click: function (e) {
              e.preventDefault();
              history("/admin/patients");
            },
          },
          {
            id: "hospitals",
            label: "Hospitals Network",
            link: "/admin/hospitals",
            click: function (e) {
              e.preventDefault();
              history("/admin/hospitals");
            },
          },
          {
            id: "users",
            label: "User Accounts",
            link: "/admin/users",
            click: function (e) {
              e.preventDefault();
              history("/admin/users");
            },
          },
          {
            id: "systemprompt",
            label: "AI System Prompt",
            link: "/admin/system-prompt",
            click: function (e) {
              e.preventDefault();
              history("/admin/system-prompt");
            },
          },
        ],
      },
      {
        label: "HOSPITAL & DISPATCH",
        isHeader: true,
      },
      {
        id: "hospitalpanel",
        label: "Hospital Operations",
        icon: "ri-hospital-line",
        link: "/#",
        stateVariables: isHospitalPanel,
        click: function (e) {
          e.preventDefault();
          setIsHospitalPanel(!isHospitalPanel);
          setIscurrentState("HospitalPanel");
        },
        subItems: [
          {
            id: "incomingcases",
            label: "Incoming Cases",
            link: "/hospital/cases",
            click: function (e) {
              e.preventDefault();
              history("/hospital/cases");
            },
          },
          {
            id: "fleetstatus",
            label: "Fleet Status",
            link: "/hospital/fleet",
            click: function (e) {
              e.preventDefault();
              history("/hospital/fleet");
            },
          },
          {
            id: "patienttracking",
            label: "Patient Radar",
            link: "/hospital/tracking",
            click: function (e) {
              e.preventDefault();
              history("/hospital/tracking");
            },
          },
        ],
      },
      {
        id: "cases",
        label: "All Cases",
        icon: "ri-briefcase-line",
        link: "/cases",
        click: function (e) {
          e.preventDefault();
          history("/cases");
        },
      },
      {
        id: "medicalchat",
        label: "Emergency Chat",
        icon: "ri-chat-voice-line",
        link: "/medical-chat",
        click: function (e) {
          e.preventDefault();
          history("/medical-chat");
        },
      }
    );
  }

  // ==========================================
  // --- HOSPITAL STAFF MENU ITEMS ---
  // ==========================================
  else if (role === "hospital") {
    menuItems.push(
      {
        label: "HOSPITAL EMERGENCY DESK",
        isHeader: true,
      },
      {
        id: "incomingcases",
        label: "Incoming Cases Feed",
        icon: "ri-alarm-warning-line",
        link: "/hospital/cases",
        click: function (e) {
          e.preventDefault();
          history("/hospital/cases");
        },
      },
      {
        id: "fleetstatus",
        label: "Ambulance Fleet",
        icon: "ri-truck-line",
        link: "/hospital/fleet",
        click: function (e) {
          e.preventDefault();
          history("/hospital/fleet");
        },
      },
      {
        id: "patienttracking",
        label: "Live Transit Radar",
        icon: "ri-navigation-line",
        link: "/hospital/tracking",
        click: function (e) {
          e.preventDefault();
          history("/hospital/tracking");
        },
      },
      {
        label: "OVERVIEW & TOOLS",
        isHeader: true,
      },
      {
        id: "dashboard",
        label: "Medical Dashboard",
        icon: "ri-dashboard-2-line",
        link: "/dashboard",
        click: function (e) {
          e.preventDefault();
          history("/dashboard");
        },
      },
      {
        id: "cases",
        label: "Case Logs",
        icon: "ri-briefcase-line",
        link: "/cases",
        click: function (e) {
          e.preventDefault();
          history("/cases");
        },
      },
      {
        id: "medicalchat",
        label: "AI Medical Triage",
        icon: "ri-chat-voice-line",
        link: "/medical-chat",
        click: function (e) {
          e.preventDefault();
          history("/medical-chat");
        },
      }
    );
  }

  // ==========================================
  // --- CITIZEN / USER MENU ITEMS ---
  // ==========================================
  else {
    menuItems.push(
      {
        label: "EMERGENCY SERVICES",
        isHeader: true,
      },
      {
        id: "emergencysos",
        label: "Emergency SOS",
        icon: "ri-alarm-warning-fill",
        link: "/user/emergency",
        badgeName: "SOS",
        badgeColor: "danger",
        click: function (e) {
          e.preventDefault();
          history("/user/emergency");
        },
      },
      {
        id: "mycases",
        label: "My Incident History",
        icon: "ri-history-line",
        link: "/user/my-cases",
        click: function (e) {
          e.preventDefault();
          history("/user/my-cases");
        },
      },
      {
        id: "trackambulance",
        label: "Track My Ambulance",
        icon: "ri-map-pin-user-line",
        link: "/user/track",
        click: function (e) {
          e.preventDefault();
          history("/user/track");
        },
      },
      {
        label: "ASSISTANCE",
        isHeader: true,
      },
      {
        id: "medicalchat",
        label: "AI Medical Chatbot",
        icon: "ri-chat-voice-line",
        link: "/medical-chat",
        click: function (e) {
          e.preventDefault();
          history("/medical-chat");
        },
      },
      {
        id: "dashboard",
        label: "Public Overview",
        icon: "ri-dashboard-line",
        link: "/dashboard",
        click: function (e) {
          e.preventDefault();
          history("/dashboard");
        },
      }
    );
  }

  return <React.Fragment>{menuItems}</React.Fragment>;
};

export default Navdata;
