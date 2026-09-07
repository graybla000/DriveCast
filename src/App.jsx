import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import ScrollToTop from './components/ScrollToTop';
import { AppStoreProvider } from '@/lib/AppStore';
import AppLayout from '@/components/AppLayout';
import Home from '@/pages/Home';
import Explore from '@/pages/Explore';
import TripPlanner from '@/pages/TripPlanner';
import Favorites from '@/pages/Favorites';
import Profile from '@/pages/Profile';
import Sports from '@/pages/Sports';
// Add page imports here

function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <Router>
        <ScrollToTop />
        <AppStoreProvider>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/plan" element={<TripPlanner />} />
              <Route path="/favorites" element={<Favorites />} />
              <Route path="/profile" element={<Profile />} />
              {/* Sports has its own screen rather than an Explore deck, because
                  it's split by sport with a team picker per sport. */}
              <Route path="/sports" element={<Sports />} />
            </Route>
            <Route path="*" element={<PageNotFound />} />
          </Routes>
        </AppStoreProvider>
      </Router>
      <Toaster />
    </QueryClientProvider>
  )
}

export default App
