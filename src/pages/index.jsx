import Layout from "./Layout.jsx";

import Dashboard from "./Dashboard";

import Reports from "./Reports";

import Procedures from "./Procedures";

import Users from "./Users";

import Roles from "./Roles";

import Groups from "./Groups";

import Resources from "./Resources";

import Contacts from "./Contacts";

import Vehicles from "./Vehicles";

import Institutions from "./Institutions";

import Locations from "./Locations";

import Shifts from "./Shifts";

import IncidentDefinitions from "./IncidentDefinitions";

import Incidents from "./Incidents";

import ManageDataTypes from "./ManageDataTypes";

import CustomDataView from "./CustomDataView";

import FormBuilder from "./FormBuilder";

import CreateIncidentPage from "./CreateIncidentPage";

import ManageIncidentPage from "./ManageIncidentPage";

import ShiftTemplatesPage from "./ShiftTemplatesPage";

import CreateShiftFromTemplatePage from "./CreateShiftFromTemplatePage";

import ShiftManagerDashboard from "./ShiftManagerDashboard";

import DashboardManagement from "./DashboardManagement";

import GuardDashboard from "./GuardDashboard";

import AutomatedReportsPage from "./AutomatedReportsPage";

import DispatcherDashboard from "./DispatcherDashboard";

import Routes from "./Routes";

import AllNotificationsPage from "./AllNotificationsPage";

import SiteMapPage from "./SiteMapPage";

import CustomRecordViewPage from "./CustomRecordViewPage";

import AutomationsPage from "./AutomationsPage";

import OrganizationSettings from "./OrganizationSettings";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Dashboard: Dashboard,
    
    Reports: Reports,
    
    Procedures: Procedures,
    
    Users: Users,
    
    Roles: Roles,
    
    Groups: Groups,
    
    Resources: Resources,
    
    Contacts: Contacts,
    
    Vehicles: Vehicles,
    
    Institutions: Institutions,
    
    Locations: Locations,
    
    Shifts: Shifts,
    
    IncidentDefinitions: IncidentDefinitions,
    
    Incidents: Incidents,
    
    ManageDataTypes: ManageDataTypes,
    
    CustomDataView: CustomDataView,
    
    FormBuilder: FormBuilder,
    
    CreateIncidentPage: CreateIncidentPage,
    
    ManageIncidentPage: ManageIncidentPage,
    
    ShiftTemplatesPage: ShiftTemplatesPage,
    
    CreateShiftFromTemplatePage: CreateShiftFromTemplatePage,
    
    ShiftManagerDashboard: ShiftManagerDashboard,
    
    DashboardManagement: DashboardManagement,
    
    GuardDashboard: GuardDashboard,
    
    AutomatedReportsPage: AutomatedReportsPage,
    
    DispatcherDashboard: DispatcherDashboard,
    
    Routes: Routes,
    
    AllNotificationsPage: AllNotificationsPage,
    
    SiteMapPage: SiteMapPage,
    
    CustomRecordViewPage: CustomRecordViewPage,
    
    AutomationsPage: AutomationsPage,
    
    OrganizationSettings: OrganizationSettings,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Dashboard />} />
                
                
                <Route path="/Dashboard" element={<Dashboard />} />
                
                <Route path="/Reports" element={<Reports />} />
                
                <Route path="/Procedures" element={<Procedures />} />
                
                <Route path="/Users" element={<Users />} />
                
                <Route path="/Roles" element={<Roles />} />
                
                <Route path="/Groups" element={<Groups />} />
                
                <Route path="/Resources" element={<Resources />} />
                
                <Route path="/Contacts" element={<Contacts />} />
                
                <Route path="/Vehicles" element={<Vehicles />} />
                
                <Route path="/Institutions" element={<Institutions />} />
                
                <Route path="/Locations" element={<Locations />} />
                
                <Route path="/Shifts" element={<Shifts />} />
                
                <Route path="/IncidentDefinitions" element={<IncidentDefinitions />} />
                
                <Route path="/Incidents" element={<Incidents />} />
                
                <Route path="/ManageDataTypes" element={<ManageDataTypes />} />
                
                <Route path="/CustomDataView" element={<CustomDataView />} />
                
                <Route path="/FormBuilder" element={<FormBuilder />} />
                
                <Route path="/CreateIncidentPage" element={<CreateIncidentPage />} />
                
                <Route path="/ManageIncidentPage" element={<ManageIncidentPage />} />
                
                <Route path="/ShiftTemplatesPage" element={<ShiftTemplatesPage />} />
                
                <Route path="/CreateShiftFromTemplatePage" element={<CreateShiftFromTemplatePage />} />
                
                <Route path="/ShiftManagerDashboard" element={<ShiftManagerDashboard />} />
                
                <Route path="/DashboardManagement" element={<DashboardManagement />} />
                
                <Route path="/GuardDashboard" element={<GuardDashboard />} />
                
                <Route path="/AutomatedReportsPage" element={<AutomatedReportsPage />} />
                
                <Route path="/DispatcherDashboard" element={<DispatcherDashboard />} />
                
                <Route path="/Routes" element={<Routes />} />
                
                <Route path="/AllNotificationsPage" element={<AllNotificationsPage />} />
                
                <Route path="/SiteMapPage" element={<SiteMapPage />} />
                
                <Route path="/CustomRecordViewPage" element={<CustomRecordViewPage />} />
                
                <Route path="/AutomationsPage" element={<AutomationsPage />} />
                
                <Route path="/OrganizationSettings" element={<OrganizationSettings />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}