/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Gallery from './pages/Gallery';
import Dashboard from './pages/Dashboard';
import ReportLost from './pages/ReportLost';
import ReportSighted from './pages/ReportSighted';
import ReportByScreenshot from './pages/ReportByScreenshot';
import ReportDetail from './pages/Reportdetaiil';
import Similarities from './pages/Similarities';

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/report/lost" element={<ReportLost />} />
          <Route path="/report/sighted" element={<ReportSighted />} />
          <Route path="/report/screenshot" element={<ReportByScreenshot />} />
          <Route path="/similarities" element={<Similarities />} />
          <Route path="/report/:id" element={<ReportDetail />} />
        </Routes>
      </Layout>
    </Router>
  );
}

