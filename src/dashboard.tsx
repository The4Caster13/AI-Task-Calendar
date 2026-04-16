import React from 'react';
import { 
  CheckCircle2, 
  Calendar as CalendarIcon, 
  Clock, 
  AlertCircle,
  ArrowRight,
  SlidersHorizontal
} from 'lucide-react';

const Dashboard = () => {
  return (
    <div className="flex-1 bg-gray-50/50 p-8 font-sans h-screen overflow-y-auto">
      
      {/* Header / Breadcrumbs */}
      <div className="flex justify-between items-center mb-8">
        <div className="text-sm font-medium text-gray-500">
          <span className="hover:text-gray-900 cursor-pointer">Pages</span> 
          <span className="mx-2">/</span> 
          <span className="text-gray-900">Dashboard</span>
        </div>
        <button className="p-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50">
          <SlidersHorizontal size={18} className="text-gray-600" />
        </button>
      </div>

      {/* Top Row Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        
        {/* Completed Goals */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <h3 className="text-gray-500 text-sm font-semibold mb-2">Completed Goals</h3>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="text-emerald-500" size={28} />
            <span className="text-3xl font-bold text-gray-800">12</span>
          </div>
          <p className="text-xs text-emerald-500 mt-2 font-medium">+2 this week</p>
        </div>

        {/* Days Tracker */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <h3 className="text-gray-500 text-sm font-semibold mb-4">Days Tracker</h3>
          <div className="flex justify-between gap-2">
            <div className="flex-1 bg-purple-50 rounded-lg p-2 text-center border border-purple-100">
              <p className="text-xs text-purple-600 font-bold mb-1">YTD</p>
              <p className="text-lg font-bold text-purple-900">284</p>
            </div>
            <div className="flex-1 bg-blue-50 rounded-lg p-2 text-center border border-blue-100">
              <p className="text-xs text-blue-600 font-bold mb-1">TD</p>
              <p className="text-lg font-bold text-blue-900">14</p>
            </div>
            <div className="flex-1 bg-teal-50 rounded-lg p-2 text-center border border-teal-100">
              <p className="text-xs text-teal-600 font-bold mb-1">TMR</p>
              <p className="text-lg font-bold text-teal-900">3</p>
            </div>
          </div>
        </div>

        {/* X Days For... */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center">
          <h3 className="text-gray-500 text-sm font-semibold mb-2">Countdown</h3>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold text-gray-800">42</span>
            <span className="text-gray-500 font-medium pb-1">Days for</span>
          </div>
          <p className="text-lg font-semibold text-indigo-600 mt-1">Project Launch</p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Month Progress (Kanban Waterfall) - Takes up 2 columns */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 mb-6">Month Progress</h3>
          
          <div className="flex items-center justify-between gap-4 h-64">
            {/* To-Do Column */}
            <div className="flex-1 h-full bg-gray-50 rounded-lg border border-gray-200 p-4 flex flex-col gap-3 overflow-y-auto shadow-inner">
              <h4 className="text-sm font-bold text-gray-600 sticky top-0 bg-gray-50 pb-2">To-Do</h4>
              <div className="bg-white p-3 rounded shadow-sm text-sm border-l-4 border-red-400">Design Mockups</div>
              <div className="bg-white p-3 rounded shadow-sm text-sm border-l-4 border-yellow-400">Write Copy</div>
            </div>

            <ArrowRight className="text-gray-300" size={24} />

            {/* Doing Column */}
            <div className="flex-1 h-full bg-blue-50/50 rounded-lg border border-blue-100 p-4 flex flex-col gap-3 overflow-y-auto shadow-inner">
              <h4 className="text-sm font-bold text-blue-700 sticky top-0 bg-blue-50/50 pb-2">Doing</h4>
              <div className="bg-white p-3 rounded shadow-sm text-sm border-l-4 border-blue-400">API Integration</div>
            </div>

            <ArrowRight className="text-gray-300" size={24} />

            {/* Done Column */}
            <div className="flex-1 h-full bg-emerald-50/50 rounded-lg border border-emerald-100 p-4 flex flex-col gap-3 overflow-y-auto shadow-inner">
              <h4 className="text-sm font-bold text-emerald-700 sticky top-0 bg-emerald-50/50 pb-2">Done</h4>
              <div className="bg-white p-3 rounded shadow-sm text-sm border-l-4 border-emerald-400">Setup Repo</div>
              <div className="bg-white p-3 rounded shadow-sm text-sm border-l-4 border-emerald-400">Database Schema</div>
            </div>
          </div>
        </div>

        {/* Urgent To-Do List */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-800">Priority Tasks</h3>
            <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded-full">Urgent</span>
          </div>
          
          <div className="flex flex-col gap-4 flex-1 overflow-y-auto">
            {/* Task Item */}
            <div className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-100">
              <AlertCircle className="text-red-500 mt-0.5" size={18} />
              <div>
                <p className="text-sm font-semibold text-gray-800">Fix Authentication Bug</p>
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                  <Clock size={12} /> Due in 2 hours
                </p>
              </div>
            </div>

            {/* Task Item */}
            <div className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-100">
              <div className="w-4 h-4 rounded-full border-2 border-orange-400 mt-1"></div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Review PR #402</p>
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                  <CalendarIcon size={12} /> Today, 4:00 PM
                </p>
              </div>
            </div>
            
            {/* Task Item */}
            <div className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-100">
              <div className="w-4 h-4 rounded-full border-2 border-yellow-400 mt-1"></div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Update Documentation</p>
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                  <CalendarIcon size={12} /> Tomorrow
                </p>
              </div>
            </div>
          </div>
          
          <button className="w-full mt-4 py-2 bg-indigo-50 text-indigo-600 font-semibold rounded-lg hover:bg-indigo-100 transition-colors text-sm">
            View All Tasks
          </button>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;