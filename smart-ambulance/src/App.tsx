import { BrowserRouter, Routes, Route } from "react-router-dom"
import CallerApp from "./pages/callerApp"
import DispatchDashboard from "./pages/DispatchDashboard"
import AmbulanceTablet from "./pages/AmbulanceTablet"
import HospitalER from "./pages/HospitalER"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CallerApp />} />
        <Route path="/dispatch" element={<DispatchDashboard />} />
        <Route path="/ambulance" element={<AmbulanceTablet />} />
        <Route path="/hospital" element={<HospitalER />} />
      </Routes>
    </BrowserRouter>
  )
}