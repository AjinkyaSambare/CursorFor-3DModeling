import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import ScenesPage from './pages/ScenesPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import TimelineEditorPage from './pages/TimelineEditorPage';
import CreateScene from './pages/CreateScene';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          {/* Timeline editor without layout wrapper for full-screen experience */}
          <Route path="/projects/:projectId/timeline" element={<TimelineEditorPage />} />
          
          {/* All other routes with layout wrapper */}
          <Route path="/" element={
            <Layout>
              <HomePage />
            </Layout>
          } />
          <Route path="/create" element={
            <Layout>
              <CreateScene />
            </Layout>
          } />
          <Route path="/scenes" element={
            <Layout>
              <ScenesPage />
            </Layout>
          } />
          <Route path="/projects" element={
            <Layout>
              <ProjectsPage />
            </Layout>
          } />
          <Route path="/projects/:projectId" element={
            <Layout>
              <ProjectDetailPage />
            </Layout>
          } />
        </Routes>
      </Router>
      
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            iconTheme: {
              primary: '#10B981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#EF4444',
              secondary: '#fff',
            },
          },
        }}
      />
      
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;