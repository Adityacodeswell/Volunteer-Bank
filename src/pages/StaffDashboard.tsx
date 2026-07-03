import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Users, CheckSquare, Calendar, MessageSquare, Plus, Mail, 
  Phone, MapPin, Award, Trash2, ArrowRight, ShieldAlert, 
  Send, UserCheck, AlertTriangle, ListFilter, ClipboardCheck, 
  CheckCircle2, FolderDot, Volume2, Search, Edit2, X, PlusCircle, Waves
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Button, Input, Select, Badge, Card, Avatar, EmptyState, SidebarNavItem, Textarea, Modal, Chip } from "../components/UI";
import { 
  VolunteerWithProfile, 
  OpportunityWithSite, 
  Task, 
  Message, 
  Site, 
  Profile, 
  VolunteerAvailability 
} from "../types";

export default function StaffDashboard() {
  const { user, apiFetch, logout } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<"overview" | "volunteers" | "tasks" | "opportunities" | "messages">("overview");
  const [loading, setLoading] = useState(true);

  // Data storage
  const [volunteers, setVolunteers] = useState<VolunteerWithProfile[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunityWithSite[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [stats, setStats] = useState<any>({
    totalVolunteers: 0,
    activeThisWeek: 0,
    hoursLogged: 0,
    openTasks: 0,
    unreadMessages: 0
  });

  // Modal controls
  const [isAddVolOpen, setIsAddVolOpen] = useState(false);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isAddOppOpen, setIsAddOppOpen] = useState(false);
  const [isBulkTaskOpen, setIsBulkTaskOpen] = useState(false);
  const [isCompleteOppOpen, setIsCompleteOppOpen] = useState(false);
  const [selectedOppForComplete, setSelectedOppForComplete] = useState<OpportunityWithSite | null>(null);

  // Credentials confirmation modal
  const [credentialsModalOpen, setCredentialsModalOpen] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<any>(null);

  // Search/Filters
  const [volSearch, setVolSearch] = useState("");
  const [selectedVolId, setSelectedVolId] = useState<string | null>(null);

  // Form states - Add Volunteer
  const [volName, setVolName] = useState("");
  const [volEmail, setVolEmail] = useState("");
  const [volPhone, setVolPhone] = useState("");
  const [volSitePref, setVolSitePref] = useState("");
  const [volInterests, setVolInterests] = useState<string[]>([]);
  const [volAvailability, setVolAvailability] = useState<VolunteerAvailability>("Weekend warrior");
  const [volHowHeard, setVolHowHeard] = useState("Social media");
  const [volEmergency, setVolEmergency] = useState("");

  // Form states - Add Task
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskAssigneeId, setTaskAssigneeId] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskPriority, setTaskPriority] = useState<"low" | "medium" | "high">("medium");
  const [taskLinkedOpp, setTaskLinkedOpp] = useState("");

  // Form states - Bulk Site Assign Task
  const [bulkTaskTitle, setBulkTaskTitle] = useState("");
  const [bulkTaskDesc, setBulkTaskDesc] = useState("");
  const [bulkTaskSite, setBulkTaskSite] = useState("");
  const [bulkTaskDueDate, setBulkTaskDueDate] = useState("");
  const [bulkTaskPriority, setBulkTaskPriority] = useState<"low" | "medium" | "high">("medium");

  // Form states - Add Opportunity
  const [oppTitle, setOppTitle] = useState("");
  const [oppSiteId, setOppSiteId] = useState("");
  const [oppType, setOppType] = useState("");
  const [oppDesc, setOppDesc] = useState("");
  const [oppCommitment, setOppCommitment] = useState("");
  const [oppDate, setOppDate] = useState("");
  const [oppCapacity, setOppCapacity] = useState("");

  // Form states - Complete Campaign
  const [attendeesList, setAttendeesList] = useState<string[]>([]); // array of volunteer ids who attended
  const [hoursToLog, setHoursToLog] = useState("3");

  // Thread messaging states
  const [activeThreadVolId, setActiveThreadVolId] = useState<string | null>(null);
  const [newStaffMessage, setNewStaffMessage] = useState("");
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [broadcastType, setBroadcastType] = useState<"site" | "tag">("site");
  const [broadcastTarget, setBroadcastTarget] = useState("");
  const [broadcastBody, setBroadcastBody] = useState("");

  // Options taxonomy lists
  const interestsList = ["Mangrove Conservation", "Creek Cleanup", "Water Quality", "Community Outreach", "Scuba Reef Survey", "Plastic Removal", "Sapling Count", "Soil Restoration", "Field School Alum"];
  const howHeardList = ["Social media", "College presentation", "Website search", "Word of mouth", "Outreach brochure"];

  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [vols, opps, tsks, msgs, sts, s_list] = await Promise.all([
        apiFetch("/api/volunteers"),
        apiFetch("/api/opportunities"),
        apiFetch("/api/tasks"),
        apiFetch("/api/messages"),
        apiFetch("/api/stats"),
        apiFetch("/api/sites")
      ]);

      setVolunteers(vols);
      setOpportunities(opps);
      setTasks(tsks);
      setMessages(msgs);
      setStats(sts);
      setSites(s_list);

      // Default dropdown values
      if (s_list.length > 0) {
        setVolSitePref(s_list[0].name);
        setOppSiteId(s_list[0].id);
        setBulkTaskSite(s_list[0].name);
      }
      if (vols.length > 0) {
        setTaskAssigneeId(vols[0].profile_id);
        if (!activeThreadVolId) {
          setActiveThreadVolId(vols[0].profile_id);
        }
      }
    } catch (err: any) {
      showToast(err.message || "Failed to load coordinator parameters", "error");
    } finally {
      setLoading(false);
    }
  }, [apiFetch, showToast, activeThreadVolId]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Handle Add Volunteer Submit
  const handleAddVolunteerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!volName || !volEmail || !volPhone || !volEmergency) {
      showToast("Please fill in all required registration fields", "error");
      return;
    }

    try {
      const res = await apiFetch("/api/volunteers", {
        method: "POST",
        body: JSON.stringify({
          full_name: volName,
          email: volEmail,
          phone: volPhone,
          site_preference: volSitePref,
          interests: volInterests,
          availability: volAvailability,
          how_heard: volHowHeard,
          emergency_contact: volEmergency
        })
      });

      // Close create form
      setIsAddVolOpen(false);
      // Reset form
      setVolName("");
      setVolEmail("");
      setVolPhone("");
      setVolInterests([]);
      setVolEmergency("");

      // Open Credentials confirmation modal
      setCreatedCredentials(res.credentials);
      setCredentialsModalOpen(true);
      showToast("Volunteer registered successfully! Security profile generated.", "success");

      loadAllData();
    } catch (err: any) {
      showToast(err.message || "Failed to register volunteer", "error");
    }
  };

  // Handle Add Task Submit
  const handleAddTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle || !taskDueDate) {
      showToast("Please enter a task title and due date", "error");
      return;
    }

    try {
      await apiFetch("/api/tasks", {
        method: "POST",
        body: JSON.stringify({
          title: taskTitle,
          description: taskDesc,
          assigned_to_volunteer_id: taskAssigneeId,
          due_date: taskDueDate,
          priority: taskPriority,
          linked_opportunity_id: taskLinkedOpp || null
        })
      });

      setIsAddTaskOpen(false);
      setTaskTitle("");
      setTaskDesc("");
      setTaskDueDate("");
      showToast("Task assigned to volunteer successfully!", "success");
      loadAllData();
    } catch (err: any) {
      showToast(err.message || "Task assignment failed", "error");
    }
  };

  // Handle Bulk Site Task Assign Submit
  const handleBulkTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkTaskTitle || !bulkTaskSite || !bulkTaskDueDate) {
      showToast("Please enter a task title, site, and due date", "error");
      return;
    }

    try {
      const res = await apiFetch("/api/tasks/bulk-site-assign", {
        method: "POST",
        body: JSON.stringify({
          title: bulkTaskTitle,
          description: bulkTaskDesc,
          site_preference: bulkTaskSite,
          due_date: bulkTaskDueDate,
          priority: bulkTaskPriority
        })
      });

      setIsBulkTaskOpen(false);
      setBulkTaskTitle("");
      setBulkTaskDesc("");
      setBulkTaskDueDate("");
      showToast(`Bulk task created! Successfully assigned to ${res.count} volunteers.`, "success");
      loadAllData();
    } catch (err: any) {
      showToast(err.message || "Bulk task assignment failed", "error");
    }
  };

  // Handle Add Opportunity Submit
  const handleAddOppSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oppTitle || !oppType || !oppDesc || !oppCommitment || !oppDate || !oppCapacity) {
      showToast("All opportunity fields are required", "error");
      return;
    }

    try {
      await apiFetch("/api/opportunities", {
        method: "POST",
        body: JSON.stringify({
          title: oppTitle,
          site_id: oppSiteId,
          type: oppType,
          description: oppDesc,
          commitment_label: oppCommitment,
          date: oppDate,
          capacity: oppCapacity
        })
      });

      setIsAddOppOpen(false);
      setOppTitle("");
      setOppType("");
      setOppDesc("");
      setOppCommitment("");
      setOppDate("");
      setOppCapacity("");
      showToast("Restoration opportunity campaign created successfully!", "success");
      loadAllData();
    } catch (err: any) {
      showToast(err.message || "Opportunity creation failed", "error");
    }
  };

  // Open complete campaign dialog
  const handleOpenCompleteCampaign = async (opp: OpportunityWithSite) => {
    setSelectedOppForComplete(opp);
    setHoursToLog(opp.commitment_label.split(" ")[0] || "3");
    
    // Fetch registered signups to checkboxes
    try {
      const signups = await apiFetch(`/api/opportunities/${opp.id}/signups`);
      const volIds = signups.map((s: any) => s.volunteer_id);
      setAttendeesList(volIds); // pre-check all signed up volunteers
      setIsCompleteOppOpen(true);
    } catch (err: any) {
      showToast("Failed to fetch signups for attendance checklist", "error");
    }
  };

  // Handle Mark Opportunity Complete & Log Hours
  const handleCompleteCampaignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOppForComplete) return;

    try {
      await apiFetch(`/api/opportunities/${selectedOppForComplete.id}/complete`, {
        method: "POST",
        body: JSON.stringify({
          attendees: attendeesList,
          hours_to_log: hoursToLog
        })
      });

      setIsCompleteOppOpen(false);
      setSelectedOppForComplete(null);
      showToast("Campaign logged! Attendance compiled and hours credited to rosters.", "success");
      loadAllData();
    } catch (err: any) {
      showToast(err.message || "Failed to finalize campaign logs", "error");
    }
  };

  // Toggle active attendee list
  const toggleAttendee = (volId: string) => {
    setAttendeesList(prev => 
      prev.includes(volId) ? prev.filter(id => id !== volId) : [...prev, volId]
    );
  };

  // Send Staff Message
  const handleSendStaffMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffMessage.trim() || !activeThreadVolId) return;

    try {
      await apiFetch("/api/messages", {
        method: "POST",
        body: JSON.stringify({
          recipient_id: activeThreadVolId,
          body: newStaffMessage
        })
      });
      setNewStaffMessage("");
      showToast("Message dispatched to volunteer", "success");
      loadAllData();
    } catch (err: any) {
      showToast(err.message || "Message dispatch failed", "error");
    }
  };

  // Handle Broadcast submit
  const handleBroadcastSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTarget || !broadcastBody) {
      showToast("Please enter a broadcast target and message body", "error");
      return;
    }

    try {
      const res = await apiFetch("/api/messages/broadcast", {
        method: "POST",
        body: JSON.stringify({
          target_type: broadcastType,
          target_value: broadcastTarget,
          body: broadcastBody
        })
      });

      setIsBroadcastOpen(false);
      setBroadcastBody("");
      showToast(`Broadcast dispatched! Sent to ${res.count} active site volunteers.`, "success");
      loadAllData();
    } catch (err: any) {
      showToast(err.message || "Broadcast dispatch failed", "error");
    }
  };

  // Update task Kanban column
  const handleMoveTaskStatus = async (taskId: string, targetStatus: "todo" | "in_progress" | "done") => {
    try {
      await apiFetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        body: JSON.stringify({ status: targetStatus })
      });
      showToast(`Task moved to ${targetStatus === "in_progress" ? "In Progress" : targetStatus === "todo" ? "To Do" : "Done"}.`, "info");
      loadAllData();
    } catch (err: any) {
      showToast("Failed to move task status", "error");
    }
  };

  // Delete Task
  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm("Are you sure you want to delete this task? This action is irreversible.")) return;
    try {
      await apiFetch(`/api/tasks/${taskId}`, {
        method: "DELETE"
      });
      showToast("Task deleted successfully", "warning");
      loadAllData();
    } catch (err: any) {
      showToast("Failed to delete task", "error");
    }
  };

  // Deactivate Volunteer
  const handleDeactivateVolunteer = async (volId: string) => {
    if (!window.confirm("Are you sure you want to deactivate this volunteer profile? They will no longer be able to access the console.")) return;
    try {
      await apiFetch(`/api/volunteers/${volId}`, {
        method: "PUT",
        body: JSON.stringify({ status: "inactive" })
      });
      showToast("Volunteer profile deactivated.", "warning");
      setSelectedVolId(null);
      loadAllData();
    } catch (err: any) {
      showToast("Deactivation failed", "error");
    }
  };

  // Toggle multi-select tags for volunteer intake
  const handleToggleTag = (tag: string) => {
    setVolInterests((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // Copy to clipboard helper
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast("Credentials copied to clipboard!", "success");
  };

  // Helpers to fetch specific threads
  const activeThread = messages.filter(
    (m) => m.sender_id === activeThreadVolId || m.recipient_id === activeThreadVolId
  );
  const activeVolProfile = volunteers.find((v) => v.profile_id === activeThreadVolId)?.profile;

  // Filter volunteers roster
  const filteredVolunteers = volunteers.filter((v) => {
    const query = volSearch.toLowerCase();
    return (
      v.profile.full_name.toLowerCase().includes(query) ||
      v.volunteer_code.toLowerCase().includes(query) ||
      v.site_preference.toLowerCase().includes(query)
    );
  });

  const selectedVolDetail = volunteers.find(v => v.profile_id === selectedVolId);

  if (loading && volunteers.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Waves className="w-10 h-10 text-cyan animate-spin mx-auto mb-4" />
          <p className="font-serif font-bold text-deep text-lg">Synchronizing Coordinator Console...</p>
          <p className="text-xs text-slate-400 mt-1">Applying regional coordinator filters and indexing volunteer rosters.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* Top Banner Console */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center shadow-xs">
        <div className="flex items-center gap-2.5">
          <Waves className="w-7 h-7 text-cyan animate-pulse" />
          <div>
            <span className="font-serif font-black text-deep text-base tracking-tight block leading-none">OCEAN SCHOOL INDIA</span>
            <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest block leading-none mt-0.5">Coordinator Console</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-right">
            <span className="text-xs font-bold text-deep block leading-none">{user?.full_name}</span>
            <span className="text-[10px] font-mono text-cyan font-bold uppercase tracking-wider block">Staff Lead</span>
          </div>
          <Button variant="ghost" onClick={logout} className="text-xs font-semibold py-1.5 px-3">
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main Grid: Left Sidebar + Content panel */}
      <div className="flex-1 flex flex-col md:flex-row">
        
        {/* Persistent left sidebar */}
        <aside className="md:w-64 bg-white border-r border-slate-100 p-4 flex flex-col gap-1 shrink-0">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2 block">Management</span>
          <SidebarNavItem 
            label="Overview Console" 
            icon={<FolderDot className="w-4 h-4" />} 
            isActive={activeTab === "overview"} 
            onClick={() => setActiveTab("overview")} 
          />
          <SidebarNavItem 
            label="My Volunteers" 
            icon={<Users className="w-4 h-4" />} 
            isActive={activeTab === "volunteers"} 
            onClick={() => setActiveTab("volunteers")} 
          />
          <SidebarNavItem 
            label="Task Board" 
            icon={<CheckSquare className="w-4 h-4" />} 
            isActive={activeTab === "tasks"} 
            onClick={() => setActiveTab("tasks")} 
          />
          <SidebarNavItem 
            label="Campaigns Board" 
            icon={<Calendar className="w-4 h-4" />} 
            isActive={activeTab === "opportunities"} 
            onClick={() => setActiveTab("opportunities")} 
          />
          <SidebarNavItem 
            label="Staff Inbox" 
            icon={<MessageSquare className="w-4 h-4" />} 
            isActive={activeTab === "messages"} 
            onClick={() => setActiveTab("messages")} 
          />

          <div className="border-t border-slate-100 mt-6 pt-4 px-3 text-xs text-slate-400 leading-relaxed">
            <span className="font-bold text-deep block mb-0.5">My Assigned Zone:</span>
            {volunteers[0]?.site_preference.includes("Dive") ? "Lakshadweep Islands" : "Navi Mumbai Estuary"}
          </div>
        </aside>

        {/* Content Panel */}
        <main className="flex-1 p-6 md:p-8 min-w-0">
          
          {/* --- TAB: OVERVIEW --- */}
          {activeTab === "overview" && (
            <div className="flex flex-col gap-8">
              
              {/* Quick statistics strip */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                <Card title="Registry Pool" subtitle="Assigned volunteers" className="text-center">
                  <span className="font-serif font-black text-3xl text-deep">{stats.totalVolunteers}</span>
                </Card>
                <Card title="Active Field Staff" subtitle="Logged in this week" className="text-center">
                  <span className="font-serif font-black text-3xl text-deep">{stats.activeThisWeek}</span>
                </Card>
                <Card title="Total Lab Hours" subtitle="Credits approved" className="text-center">
                  <span className="font-serif font-black text-3xl text-deep">{stats.hoursLogged}h</span>
                </Card>
                <Card title="Open Tasks" subtitle="Awaiting completion" className="text-center">
                  <span className="font-serif font-black text-3xl text-deep">{stats.openTasks}</span>
                </Card>
                <Card title="Direct Unread" subtitle="Direct citizen logs" className="text-center">
                  <span className="font-serif font-black text-3xl text-deep">{stats.unreadMessages}</span>
                </Card>
              </div>

              {/* Action grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Quick actions box */}
                <Card title="Regional Operations Quick Launch" subtitle="Operational shortcuts for daily coordinator tasks">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      onClick={() => setIsAddVolOpen(true)}
                      className="p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100/50 hover:border-slate-200 transition text-left flex items-start gap-4 cursor-pointer group"
                    >
                      <PlusCircle className="w-8 h-8 text-cyan shrink-0" />
                      <div>
                        <h4 className="font-bold text-xs text-deep group-hover:text-cyan">Add Volunteer</h4>
                        <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">Launch intake interview form & issue security profile credentials.</p>
                      </div>
                    </button>

                    <button
                      onClick={() => setIsAddTaskOpen(true)}
                      className="p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100/50 hover:border-slate-200 transition text-left flex items-start gap-4 cursor-pointer group"
                    >
                      <CheckSquare className="w-8 h-8 text-cyan shrink-0" />
                      <div>
                        <h4 className="font-bold text-xs text-deep group-hover:text-cyan">New Task</h4>
                        <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">Assign individual bio-indicator testing or cleanup safety checks.</p>
                      </div>
                    </button>

                    <button
                      onClick={() => setIsBulkTaskOpen(true)}
                      className="p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100/50 hover:border-slate-200 transition text-left flex items-start gap-4 cursor-pointer group"
                    >
                      <ListFilter className="w-8 h-8 text-cyan shrink-0" />
                      <div>
                        <h4 className="font-bold text-xs text-deep group-hover:text-cyan">Bulk Site Task</h4>
                        <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">Broadcast tasks to all active volunteers matching a site preference.</p>
                      </div>
                    </button>

                    <button
                      onClick={() => setIsBroadcastOpen(true)}
                      className="p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100/50 hover:border-slate-200 transition text-left flex items-start gap-4 cursor-pointer group"
                    >
                      <Volume2 className="w-8 h-8 text-cyan shrink-0" />
                      <div>
                        <h4 className="font-bold text-xs text-deep group-hover:text-cyan">Broadcast Msg</h4>
                        <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">Broadcast messages instantly to site-specific groups or interest tags.</p>
                      </div>
                    </button>
                  </div>
                </Card>

                {/* Recent activity summary info */}
                <Card title="Active Field Roster Summary" subtitle="Roster outline for quick operational monitoring">
                  <div className="flex flex-col gap-3">
                    {volunteers.slice(0, 4).map((vol) => (
                      <div key={vol.profile_id} className="p-3 bg-slate-50 border border-slate-100 rounded-lg flex justify-between items-center text-xs">
                        <div className="flex items-center gap-3">
                          <Avatar name={vol.profile.full_name} size="sm" />
                          <div>
                            <span className="font-bold text-deep block">{vol.profile.full_name}</span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">{vol.site_preference}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-bold block text-slate-700">{vol.hours_logged}h</span>
                          <Badge status={vol.status} className="text-[9px]" />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

              </div>
            </div>
          )}

          {/* --- TAB: MY VOLUNTEERS --- */}
          {activeTab === "volunteers" && (
            <div className="flex flex-col gap-6">
              
              {/* Filter panel */}
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-center border-b border-slate-100 pb-4">
                <div className="w-full sm:max-w-xs relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Search volunteers code or site..."
                    value={volSearch}
                    onChange={(e) => setVolSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan"
                  />
                </div>

                <Button onClick={() => setIsAddVolOpen(true)} className="w-full sm:w-auto text-xs py-2 px-4">
                  <Plus className="w-4 h-4" />
                  Register New Volunteer
                </Button>
              </div>

              {/* Volunteers list and detailed panel split layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left side list */}
                <Card title="Assigned Volunteers Roster" subtitle={`Matching: ${filteredVolunteers.length}`} className="lg:col-span-2">
                  {filteredVolunteers.length === 0 ? (
                    <EmptyState 
                      title="No matching volunteers" 
                      description="No active or pending volunteers found matching your query." 
                    />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 text-slate-400 uppercase font-mono tracking-wider">
                            <th className="py-2.5">Name</th>
                            <th className="py-2.5">Code</th>
                            <th className="py-2.5">Site Preference</th>
                            <th className="py-2.5">Hours</th>
                            <th className="py-2.5">Status</th>
                            <th className="py-2.5 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredVolunteers.map((vol) => (
                            <tr 
                              key={vol.profile_id} 
                              onClick={() => setSelectedVolId(vol.profile_id)}
                              className={`border-b border-slate-50 hover:bg-slate-50/50 cursor-pointer transition ${selectedVolId === vol.profile_id ? "bg-slate-50" : ""}`}
                            >
                              <td className="py-3 font-semibold text-deep flex items-center gap-2">
                                <Avatar name={vol.profile.full_name} size="sm" />
                                {vol.profile.full_name}
                              </td>
                              <td className="py-3 font-mono text-[10px] text-slate-400 font-bold">{vol.volunteer_code}</td>
                              <td className="py-3 text-slate-500 font-medium">{vol.site_preference}</td>
                              <td className="py-3 font-bold text-slate-700">{vol.hours_logged}h</td>
                              <td className="py-3"><Badge status={vol.status} className="text-[10px]" /></td>
                              <td className="py-3 text-right">
                                <Button variant="ghost" onClick={() => setSelectedVolId(vol.profile_id)} className="text-[10px] p-1.5 h-auto">
                                  View Detail
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>

                {/* Right side detailed pane */}
                <div className="lg:col-span-1">
                  {selectedVolDetail ? (
                    <Card title="Volunteer Detail Desk" subtitle={selectedVolDetail.profile.full_name}>
                      <div className="flex flex-col gap-5 text-xs text-slate-600">
                        <div className="flex flex-col items-center border-b border-slate-100 pb-4">
                          <Avatar name={selectedVolDetail.profile.full_name} size="lg" className="mb-2" />
                          <span className="font-bold text-deep text-sm block">{selectedVolDetail.profile.full_name}</span>
                          <span className="font-mono text-[10px] text-cyan font-bold">{selectedVolDetail.volunteer_code}</span>
                          <Badge status={selectedVolDetail.status} className="text-[9px] mt-2" />
                        </div>

                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Contact Parameters</span>
                          <p className="flex items-center gap-1.5 font-medium"><Mail className="w-3.5 h-3.5 text-slate-400" /> {selectedVolDetail.profile.email}</p>
                          <p className="flex items-center gap-1.5 font-medium mt-1.5"><Phone className="w-3.5 h-3.5 text-slate-400" /> {selectedVolDetail.profile.phone}</p>
                        </div>

                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Site Preference & Schedule</span>
                          <p className="font-semibold text-deep leading-relaxed">{selectedVolDetail.site_preference}</p>
                          <p className="text-slate-500 mt-0.5">{selectedVolDetail.availability}</p>
                        </div>

                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Emergency Contacts</span>
                          <p className="font-semibold text-deep leading-relaxed">{selectedVolDetail.emergency_contact || "Not provided"}</p>
                        </div>

                        <div className="border-t border-slate-100 pt-4 flex gap-3">
                          <Button variant="danger" onClick={() => handleDeactivateVolunteer(selectedVolDetail.profile_id)} className="flex-1 text-[10px] py-2">
                            Deactivate Profile
                          </Button>
                          <Button variant="secondary" onClick={() => { setActiveThreadVolId(selectedVolDetail.profile_id); setActiveTab("messages"); }} className="flex-1 text-[10px] py-2">
                            Direct message
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ) : (
                    <div className="h-full rounded-xl bg-white border border-dashed border-slate-200 p-8 flex flex-col items-center justify-center text-center">
                      <Users className="w-10 h-10 text-slate-300 mb-2" />
                      <h4 className="font-serif font-bold text-deep text-sm">Select Volunteer</h4>
                      <p className="text-xs text-slate-400 max-w-xs mt-1">Click on any volunteer in the master list to review detailed profiles, safety logs, and direct message threads.</p>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* --- TAB: TASK BOARD --- */}
          {activeTab === "tasks" && (
            <div className="flex flex-col gap-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <div>
                  <h2 className="font-serif font-black text-xl text-deep">Task Kanban Board</h2>
                  <p className="text-slate-400 text-xs mt-0.5">Track and manage bio-indicator tasks assigned to your volunteer unit.</p>
                </div>

                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => setIsBulkTaskOpen(true)} className="text-xs py-2 px-3">
                    <ListFilter className="w-4 h-4" />
                    Bulk Site Assign
                  </Button>
                  <Button onClick={() => setIsAddTaskOpen(true)} className="text-xs py-2 px-4">
                    <Plus className="w-4 h-4" />
                    Assign Individual Task
                  </Button>
                </div>
              </div>

              {/* Kanban columns */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Column: To Do */}
                <div className="flex flex-col gap-4">
                  <div className="p-3 bg-slate-100 rounded-lg flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">To Do</span>
                    <span className="px-2 py-0.5 bg-slate-200 rounded text-[10px] font-bold text-slate-600">
                      {tasks.filter(t => t.status === "todo").length}
                    </span>
                  </div>

                  <div className="flex flex-col gap-3 min-h-[50vh] bg-slate-50/50 p-2 rounded-xl border border-slate-100">
                    {tasks.filter(t => t.status === "todo").map((task) => (
                      <div key={task.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs hover:border-slate-200 transition relative group">
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-[10px] font-mono text-cyan font-bold">{task.volunteer_name}</span>
                          <Badge status={task.priority} className="text-[9px] px-1.5 py-0" />
                        </div>
                        <h4 className="font-bold text-xs text-deep mt-2 leading-snug">{task.title}</h4>
                        <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">{task.description}</p>
                        
                        <div className="border-t border-slate-50 mt-3 pt-2.5 flex justify-between items-center text-[9px] text-slate-400 font-mono">
                          <span>DUE: {task.due_date}</span>
                          <div className="flex gap-1.5">
                            <button onClick={() => handleDeleteTask(task.id)} className="text-coral hover:text-red-700 font-bold">Delete</button>
                            <button onClick={() => handleMoveTaskStatus(task.id, "in_progress")} className="text-navy hover:text-deep font-bold">Start &rarr;</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Column: In Progress */}
                <div className="flex flex-col gap-4">
                  <div className="p-3 bg-sky-50 rounded-lg flex justify-between items-center">
                    <span className="text-xs font-bold text-sky-800 uppercase tracking-wide">In Progress</span>
                    <span className="px-2 py-0.5 bg-sky-100 rounded text-[10px] font-bold text-sky-700">
                      {tasks.filter(t => t.status === "in_progress").length}
                    </span>
                  </div>

                  <div className="flex flex-col gap-3 min-h-[50vh] bg-slate-50/50 p-2 rounded-xl border border-slate-100">
                    {tasks.filter(t => t.status === "in_progress").map((task) => (
                      <div key={task.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs hover:border-slate-200 transition relative">
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-[10px] font-mono text-cyan font-bold">{task.volunteer_name}</span>
                          <Badge status={task.priority} className="text-[9px] px-1.5 py-0" />
                        </div>
                        <h4 className="font-bold text-xs text-deep mt-2 leading-snug">{task.title}</h4>
                        <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">{task.description}</p>
                        
                        <div className="border-t border-slate-50 mt-3 pt-2.5 flex justify-between items-center text-[9px] text-slate-400 font-mono">
                          <span>DUE: {task.due_date}</span>
                          <div className="flex gap-1.5">
                            <button onClick={() => handleMoveTaskStatus(task.id, "todo")} className="text-slate-400 hover:text-slate-600 font-bold">&larr; Back</button>
                            <button onClick={() => handleMoveTaskStatus(task.id, "done")} className="text-emerald-600 hover:text-emerald-700 font-bold">Finish &rarr;</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Column: Done */}
                <div className="flex flex-col gap-4">
                  <div className="p-3 bg-emerald-50 rounded-lg flex justify-between items-center">
                    <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">Done</span>
                    <span className="px-2 py-0.5 bg-emerald-100 rounded text-[10px] font-bold text-emerald-700">
                      {tasks.filter(t => t.status === "done").length}
                    </span>
                  </div>

                  <div className="flex flex-col gap-3 min-h-[50vh] bg-slate-50/50 p-2 rounded-xl border border-slate-100">
                    {tasks.filter(t => t.status === "done").map((task) => (
                      <div key={task.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs hover:border-slate-200 transition relative opacity-75">
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-[10px] font-mono text-cyan font-bold">{task.volunteer_name}</span>
                          <Badge status="done" className="text-[9px] px-1.5 py-0" />
                        </div>
                        <h4 className="font-bold text-xs text-deep mt-2 leading-snug line-through text-slate-400">{task.title}</h4>
                        <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">{task.description}</p>
                        
                        <div className="border-t border-slate-50 mt-3 pt-2.5 flex justify-between items-center text-[9px] text-slate-400 font-mono">
                          <span>COMPLETED</span>
                          <button onClick={() => handleMoveTaskStatus(task.id, "in_progress")} className="text-sky-600 hover:text-sky-700 font-bold">&larr; Re-open</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* --- TAB: CAMPAIGNS --- */}
          {activeTab === "opportunities" && (
            <div className="flex flex-col gap-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <div>
                  <h2 className="font-serif font-black text-xl text-deep">Coastal Restoration Campaigns</h2>
                  <p className="text-slate-400 text-xs mt-0.5">Create open opportunities, log completions, and assign field hours.</p>
                </div>

                <Button onClick={() => setIsAddOppOpen(true)} className="text-xs py-2 px-4">
                  <Plus className="w-4 h-4" />
                  Create Opportunity Drive
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {opportunities.map((opp) => {
                  const isCompleted = opp.status === "completed";
                  return (
                    <div key={opp.id} className={`bg-white rounded-xl border border-slate-100 overflow-hidden shadow-xs hover:shadow-md transition-all ${isCompleted ? "opacity-75" : ""}`}>
                      <div className="p-5">
                        <div className="flex justify-between items-start">
                          <Badge status={opp.status} />
                          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wide">{opp.commitment_label}</span>
                        </div>

                        <h3 className="font-serif font-bold text-base text-deep mt-3">{opp.title}</h3>
                        <p className="text-xs text-slate-500 mt-2 leading-relaxed">{opp.description}</p>

                        <div className="border-t border-slate-50 mt-4 pt-3 flex flex-wrap gap-x-4 gap-y-2 text-[10px] text-slate-400 font-mono">
                          <div>SITE: <span className="font-bold text-slate-600">{opp.site?.name}</span></div>
                          <div>DATE: <span className="font-bold text-slate-600">{opp.date}</span></div>
                          <div>CAPACITY: <span className="font-bold text-slate-600">{opp.signup_count}/{opp.capacity}</span></div>
                        </div>
                      </div>

                      <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex justify-between items-center text-xs">
                        <span className="text-[10px] font-mono font-bold text-slate-400">SIGNUPS: {opp.signup_count}</span>
                        {!isCompleted ? (
                          <Button variant="secondary" onClick={() => handleOpenCompleteCampaign(opp)} className="text-[11px] py-1.5 px-3">
                            Complete & Log Hours
                          </Button>
                        ) : (
                          <span className="text-xs font-semibold text-emerald-600 inline-flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4" />
                            Campaign Logged
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* --- TAB: STAFF INBOX --- */}
          {activeTab === "messages" && (
            <div className="flex flex-col gap-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <div>
                  <h2 className="font-serif font-black text-xl text-deep">Staff Messenger Inbox</h2>
                  <p className="text-slate-400 text-xs mt-0.5">Secure 1:1 threads with assigned volunteers or broadcast parameters.</p>
                </div>

                <Button variant="secondary" onClick={() => setIsBroadcastOpen(true)} className="text-xs py-2 px-3">
                  <Volume2 className="w-4 h-4 animate-bounce" />
                  Site Broadcast
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-white border border-slate-100 rounded-xl overflow-hidden h-[65vh]">
                
                {/* Conversations Side Menu */}
                <div className="lg:col-span-1 border-r border-slate-100 overflow-y-auto flex flex-col divide-y divide-slate-50">
                  <div className="p-4 bg-slate-50 text-xs font-bold text-deep uppercase tracking-wider font-mono">
                    My Thread Contacts
                  </div>

                  {volunteers.map((vol) => {
                    const lastMsg = messages.filter(
                      (m) => m.sender_id === vol.profile_id || m.recipient_id === vol.profile_id
                    ).slice(-1)[0];
                    const hasUnread = lastMsg && lastMsg.recipient_id === user!.id && !lastMsg.read;

                    return (
                      <div
                        key={vol.profile_id}
                        onClick={() => setActiveThreadVolId(vol.profile_id)}
                        className={`p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition ${activeThreadVolId === vol.profile_id ? "bg-slate-50" : ""}`}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar name={vol.profile.full_name} size="sm" />
                          <div>
                            <span className="font-semibold text-deep text-xs block">{vol.profile.full_name}</span>
                            <span className="text-[10px] text-slate-400 block truncate max-w-[150px] mt-0.5">
                              {lastMsg ? lastMsg.body : "No messages yet"}
                            </span>
                          </div>
                        </div>

                        {hasUnread && (
                          <span className="w-2.5 h-2.5 rounded-full bg-cyan shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Conversation body */}
                <div className="lg:col-span-2 flex flex-col h-full justify-between bg-slate-50/30">
                  {activeVolProfile ? (
                    <>
                      {/* Thread header */}
                      <div className="px-6 py-4 bg-white border-b border-slate-100 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-3">
                          <Avatar name={activeVolProfile.full_name} size="sm" />
                          <div>
                            <span className="font-bold text-deep text-xs block leading-none">{activeVolProfile.full_name}</span>
                            <span className="text-[10px] text-slate-400 font-mono tracking-wider">SECURE DIRECT 1:1 LINE</span>
                          </div>
                        </div>
                      </div>

                      {/* Thread body messages list */}
                      <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-3">
                        {activeThread.length === 0 ? (
                          <div className="h-full flex items-center justify-center text-center">
                            <p className="text-xs text-slate-400 italic">No historical messages found. Begin conversation below.</p>
                          </div>
                        ) : (
                          activeThread.map((msg) => {
                            const isMe = msg.sender_id === user!.id;
                            return (
                              <div
                                key={msg.id}
                                className={`max-w-[70%] p-3.5 rounded-xl text-xs leading-relaxed ${
                                  isMe
                                    ? "bg-navy text-white rounded-br-none self-end shadow-xs"
                                    : "bg-white text-slate-800 border border-slate-100 rounded-bl-none self-start shadow-xs"
                                }`}
                              >
                                <p>{msg.body}</p>
                                <span className={`text-[9px] block text-right mt-1.5 ${isMe ? "text-slate-300" : "text-slate-400"}`}>
                                  {new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Msg input */}
                      <form onSubmit={handleSendStaffMessage} className="bg-white border-t border-slate-100 p-4 flex gap-3 shrink-0">
                        <input
                          type="text"
                          placeholder={`Type direct message to ${activeVolProfile.full_name}...`}
                          value={newStaffMessage}
                          onChange={(e) => setNewStaffMessage(e.target.value)}
                          className="flex-1 px-4 py-2.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan"
                        />
                        <button
                          type="submit"
                          disabled={!newStaffMessage.trim()}
                          className="px-5 py-2.5 bg-navy hover:bg-deep disabled:opacity-50 text-white rounded-lg text-xs font-bold shrink-0 transition inline-flex items-center gap-1 cursor-pointer"
                        >
                          Send Message
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    </>
                  ) : (
                    <div className="h-full flex items-center justify-center text-center p-8">
                      <div>
                        <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                        <h4 className="font-serif font-bold text-deep text-sm">Select Conversation</h4>
                        <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">Select an active volunteer from the left contact list to establish a direct secure message channel.</p>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

        </main>
      </div>

      {/* --- MODAL: ADD VOLUNTEER (Intake Questionnaires) --- */}
      <Modal isOpen={isAddVolOpen} onClose={() => setIsAddVolOpen(false)} title="Volunteer Intake Registration Form">
        <form onSubmit={handleAddVolunteerSubmit} className="flex flex-col gap-4">
          <Input
            label="Full Name"
            placeholder="E.g. Sneha Patel"
            value={volName}
            onChange={(e) => setVolName(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="e.g. name@gmail.com"
              value={volEmail}
              onChange={(e) => setVolEmail(e.target.value)}
              required
            />
            <Input
              label="Phone Number"
              placeholder="+91 XXXXX XXXXX"
              value={volPhone}
              onChange={(e) => setVolPhone(e.target.value)}
              required
            />
          </div>

          <Select
            label="Preferred Location Site"
            value={volSitePref}
            onChange={(e) => setVolSitePref(e.target.value)}
            options={sites.map(s => ({ value: s.name, label: `${s.name} (${s.category})` }))}
          />

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-deep/70">Conservation Interests (Multi-select)</span>
            <div className="flex flex-wrap gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              {interestsList.map((tag) => {
                const isSelected = volInterests.includes(tag);
                return (
                  <Chip
                    key={tag}
                    label={tag}
                    isSelected={isSelected}
                    onClick={() => handleToggleTag(tag)}
                  />
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Intake Time Commitment Availability"
              value={volAvailability}
              onChange={(e) => setVolAvailability(e.target.value as any)}
              options={[
                { value: "A day or two a year", label: "A day or two a year" },
                { value: "Several times a month", label: "Several times a month" },
                { value: "Three weeks or longer", label: "Three weeks or longer" },
                { value: "Weekend warrior", label: "Weekend warrior" }
              ]}
            />

            <Select
              label="How did they hear about OSI?"
              value={volHowHeard}
              onChange={(e) => setVolHowHeard(e.target.value)}
              options={howHeardList.map(h => ({ value: h, label: h }))}
            />
          </div>

          <Input
            label="Emergency Contact & Relationship"
            placeholder="Kiran Patel (Father) - +91 XXXXX XXXXX"
            value={volEmergency}
            onChange={(e) => setVolEmergency(e.target.value)}
            required
          />

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={() => setIsAddVolOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Register & Generate Profile
            </Button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL: STAFF CONFIRM CREDENTIALS (Supabase Mock Edge Output) --- */}
      <Modal isOpen={credentialsModalOpen} onClose={() => setCredentialsModalOpen(false)} title="Credentials Share-Slip Generated">
        {createdCredentials && (
          <div className="flex flex-col gap-4 text-xs">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 flex gap-3 text-emerald-800 leading-relaxed mb-2">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
              <div>
                <span className="font-bold">Credential Slip Generated!</span> Copy and send this slip securely to the new volunteer. They will be forced to set a new password on their first login.
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 font-mono text-slate-600 relative select-all flex flex-col gap-2">
              <div>
                <span className="font-bold text-deep">Volunteer Registry Code:</span> {createdCredentials.volunteer_code}
              </div>
              <div>
                <span className="font-bold text-deep">Secure Portal ID:</span> {createdCredentials.email}
              </div>
              <div>
                <span className="font-bold text-deep">Temporary Password:</span> {createdCredentials.password}
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-4">
              <Button variant="ghost" onClick={() => setCredentialsModalOpen(false)}>
                Close Window
              </Button>
              <Button onClick={() => copyToClipboard(`Ocean School India - Volunteer Login\nRegistry Code: ${createdCredentials.volunteer_code}\nPortal ID: ${createdCredentials.email}\nTemporary Password: ${createdCredentials.password}`)}>
                Copy Credentials Slip
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* --- MODAL: INDIVIDUAL TASK CREATOR --- */}
      <Modal isOpen={isAddTaskOpen} onClose={() => setIsAddTaskOpen(false)} title="Assign Individual Task">
        <form onSubmit={handleAddTaskSubmit} className="flex flex-col gap-4">
          <Input
            label="Task Title"
            placeholder="Water sampling bottle deliver..."
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            required
          />

          <Textarea
            label="Task Description"
            placeholder="Include specific coordinates or kit checklists..."
            value={taskDesc}
            onChange={(e) => setTaskDesc(e.target.value)}
            rows={3}
          />

          <Select
            label="Assignee Volunteer"
            value={taskAssigneeId}
            onChange={(e) => setTaskAssigneeId(e.target.value)}
            options={volunteers.map(v => ({ value: v.profile_id, label: `${v.profile.full_name} (${v.volunteer_code})` }))}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Due Date"
              type="date"
              value={taskDueDate}
              onChange={(e) => setTaskDueDate(e.target.value)}
              required
            />

            <Select
              label="Priority"
              value={taskPriority}
              onChange={(e) => setTaskPriority(e.target.value as any)}
              options={[
                { value: "low", label: "Low Priority" },
                { value: "medium", label: "Medium Priority" },
                { value: "high", label: "Urgent Priority" }
              ]}
            />
          </div>

          <Select
            label="Link to Campaign Opportunity (Optional)"
            value={taskLinkedOpp}
            onChange={(e) => setTaskLinkedOpp(e.target.value)}
            options={[
              { value: "", label: "No linked campaign" },
              ...opportunities.map(o => ({ value: o.id, label: o.title }))
            ]}
          />

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={() => setIsAddTaskOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Dispatch Task
            </Button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL: BULK SITE TASK ASSIGNER --- */}
      <Modal isOpen={isBulkTaskOpen} onClose={() => setIsBulkTaskOpen(false)} title="Bulk Site Task Assigner">
        <form onSubmit={handleBulkTaskSubmit} className="flex flex-col gap-4">
          <Input
            label="Bulk Task Title"
            placeholder="Safety equipment verify..."
            value={bulkTaskTitle}
            onChange={(e) => setBulkTaskTitle(e.target.value)}
            required
          />

          <Textarea
            label="Bulk Task Description"
            placeholder="Assign this task to ALL volunteers who prefer this location."
            value={bulkTaskDesc}
            onChange={(e) => setBulkTaskDesc(e.target.value)}
            rows={3}
          />

          <Select
            label="Target Site Group"
            value={bulkTaskSite}
            onChange={(e) => setBulkTaskSite(e.target.value)}
            options={sites.map(s => ({ value: s.name, label: s.name }))}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Due Date"
              type="date"
              value={bulkTaskDueDate}
              onChange={(e) => setBulkTaskDueDate(e.target.value)}
              required
            />

            <Select
              label="Priority"
              value={bulkTaskPriority}
              onChange={(e) => setBulkTaskPriority(e.target.value as any)}
              options={[
                { value: "low", label: "Low Priority" },
                { value: "medium", label: "Medium Priority" },
                { value: "high", label: "Urgent Priority" }
              ]}
            />
          </div>

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={() => setIsBulkTaskOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Dispatch Bulk Task
            </Button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL: CREATE OPPORTUNITY DRIVE --- */}
      <Modal isOpen={isAddOppOpen} onClose={() => setIsAddOppOpen(false)} title="Create Restoration Campaign Drive">
        <form onSubmit={handleAddOppSubmit} className="flex flex-col gap-4">
          <Input
            label="Opportunity Title"
            placeholder="E.g. Mangrove Density Survey..."
            value={oppTitle}
            onChange={(e) => setOppTitle(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Assigned Site Sector"
              value={oppSiteId}
              onChange={(e) => setOppSiteId(e.target.value)}
              options={sites.map(s => ({ value: s.id, label: s.name }))}
            />

            <Input
              label="Campaign Type"
              placeholder="Creek Cleanup / Coral survey..."
              value={oppType}
              onChange={(e) => setOppType(e.target.value)}
              required
            />
          </div>

          <Textarea
            label="Campaign Action Description"
            placeholder="Detail muddy boot requirements, open cert constraints or hydration details."
            value={oppDesc}
            onChange={(e) => setOppDesc(e.target.value)}
            rows={3}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Commitment Label"
              placeholder="e.g. 4 hours"
              value={oppCommitment}
              onChange={(e) => setOppCommitment(e.target.value)}
              required
            />

            <Input
              label="Target Drive Date"
              type="date"
              value={oppDate}
              onChange={(e) => setOppDate(e.target.value)}
              required
            />

            <Input
              label="Capacity (Volunteers)"
              type="number"
              value={oppCapacity}
              onChange={(e) => setOppCapacity(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={() => setIsAddOppOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Publish Campaign
            </Button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL: COMPLETE CAMPAIGN & LOG ATTENDANCE --- */}
      <Modal isOpen={isCompleteOppOpen} onClose={() => setIsCompleteOppOpen(false)} title="Finalise Campaign & Credit Hours">
        {selectedOppForComplete && (
          <form onSubmit={handleCompleteCampaignSubmit} className="flex flex-col gap-4">
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 flex gap-2 text-amber-800 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Finalising completes the campaign and automatically credits the specified hours to the checked volunteers.</span>
            </div>

            <h4 className="font-bold text-xs text-deep">Drive Title: {selectedOppForComplete.title}</h4>

            <Input
              label="Hours to Credit (Numerical)"
              type="number"
              value={hoursToLog}
              onChange={(e) => setHoursToLog(e.target.value)}
              required
            />

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-deep/70">Attendance Checksheet (Checked = Attended)</span>
              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg bg-white p-3 flex flex-col gap-2">
                {volunteers.map(vol => {
                  const isChecked = attendeesList.includes(vol.profile_id);
                  return (
                    <label key={vol.profile_id} className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer p-1 rounded hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleAttendee(vol.profile_id)}
                        className="w-4 h-4 rounded border-slate-300 text-cyan focus:ring-cyan"
                      />
                      <span className="font-medium">{vol.profile.full_name} ({vol.volunteer_code})</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
              <Button type="button" variant="ghost" onClick={() => setIsCompleteOppOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Finalise Drive Logs
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* --- MODAL: SITE BROADCAST UTILITY --- */}
      <Modal isOpen={isBroadcastOpen} onClose={() => setIsBroadcastOpen(false)} title="Site & Tag Broadcasting Unit">
        <form onSubmit={handleBroadcastSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => { setBroadcastType("site"); setBroadcastTarget(sites[0]?.name || ""); }}
              className={`py-1.5 rounded-lg text-xs font-semibold transition ${broadcastType === "site" ? "bg-white text-deep shadow-sm" : "text-slate-500"}`}
            >
              Broadcast by Site
            </button>
            <button
              type="button"
              onClick={() => { setBroadcastType("tag"); setBroadcastTarget(interestsList[0]); }}
              className={`py-1.5 rounded-lg text-xs font-semibold transition ${broadcastType === "tag" ? "bg-white text-deep shadow-sm" : "text-slate-500"}`}
            >
              Broadcast by Interest Tag
            </button>
          </div>

          {broadcastType === "site" ? (
            <Select
              label="Target Site"
              value={broadcastTarget}
              onChange={(e) => setBroadcastTarget(e.target.value)}
              options={sites.map(s => ({ value: s.name, label: s.name }))}
            />
          ) : (
            <Select
              label="Target Interest Tag"
              value={broadcastTarget}
              onChange={(e) => setBroadcastTarget(e.target.value)}
              options={interestsList.map(t => ({ value: t, label: t }))}
            />
          )}

          <Textarea
            label="Broadcast Message Body"
            placeholder="Type your alert or instruction. An automatic [BROADCAST] header is attached."
            value={broadcastBody}
            onChange={(e) => setBroadcastBody(e.target.value)}
            rows={4}
            required
          />

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={() => setIsBroadcastOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Dispatch Broadcast
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
