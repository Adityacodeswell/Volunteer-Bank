import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Building2, Users, Map, Clock, Calendar, Search, Plus, 
  Trash2, Mail, Phone, MapPin, Award, ArrowRight, ShieldCheck, 
  CheckCircle2, FileSpreadsheet, Settings, AlertTriangle, 
  Sparkles, RefreshCw, Layers, MapPinOff, UserMinus, ToggleLeft, ToggleRight, Waves
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Button, Input, Select, Badge, Card, Avatar, EmptyState, SidebarNavItem, Textarea, Modal } from "../components/UI";
import { 
  VolunteerWithProfile, 
  OpportunityWithSite, 
  Site, 
  Profile, 
  ActivityLog,
  StaffWithProfile
} from "../types";

export default function AdminDashboard() {
  const { user, apiFetch, logout } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<"overview" | "staff" | "volunteers" | "campaigns" | "settings">("overview");
  const [loading, setLoading] = useState(true);

  // Data states
  const [staffList, setStaffList] = useState<StaffWithProfile[]>([]);
  const [volunteers, setVolunteers] = useState<VolunteerWithProfile[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunityWithSite[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState<any>({
    totalVolunteers: 0,
    totalStaff: 0,
    activeOpps: 0,
    totalHours: 0,
    sitesCovered: 0,
    volunteersByCoord: {},
    recentLogs: []
  });

  // Modal controls
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [isAddSiteOpen, setIsAddSiteOpen] = useState(false);
  const [isReassignOpen, setIsReassignOpen] = useState(false);
  const [staffCredsOpen, setStaffCredsOpen] = useState(false);
  const [createdStaffCreds, setCreatedStaffCreds] = useState<any>(null);

  // Filter states - Master DB
  const [filterSearch, setFilterSearch] = useState("");
  const [filterCoordinator, setFilterCoordinator] = useState("all");
  const [filterSite, setFilterSite] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Reassign coordinator action state
  const [reassignVolIds, setReassignVolIds] = useState<string[]>([]);
  const [targetCoordId, setTargetCoordId] = useState("");

  // Add staff form state
  const [staffName, setStaffName] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPhone, setStaffPhone] = useState("");
  const [staffRegion, setStaffRegion] = useState("Navi Mumbai");

  // Add site form state
  const [siteName, setSiteName] = useState("");
  const [siteDepth, setSiteDepth] = useState("5m");
  const [siteCategory, setSiteCategory] = useState("Creek");

  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [vols, opps, s_list, logs, st, staff] = await Promise.all([
        apiFetch("/api/volunteers"),
        apiFetch("/api/opportunities"),
        apiFetch("/api/sites"),
        apiFetch("/api/activity-log"),
        apiFetch("/api/stats"),
        apiFetch("/api/staff")
      ]);

      setVolunteers(vols);
      setOpportunities(opps);
      setSites(s_list);
      setActivityLogs(logs);
      setStats(st);
      setStaffList(staff);

      if (staff.length > 0) {
        setTargetCoordId(staff[0].profile.id);
      }
    } catch (err: any) {
      showToast(err.message || "Failed to load master admin metrics", "error");
    } finally {
      setLoading(false);
    }
  }, [apiFetch, showToast]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Handle Add Staff
  const handleAddStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffName || !staffEmail || !staffPhone) {
      showToast("Please enter all coordinator details", "error");
      return;
    }

    try {
      const res = await apiFetch("/api/staff", {
        method: "POST",
        body: JSON.stringify({
          full_name: staffName,
          email: staffEmail,
          phone: staffPhone,
          assigned_region: staffRegion
        })
      });

      setIsAddStaffOpen(false);
      setStaffName("");
      setStaffEmail("");
      setStaffPhone("");

      setCreatedStaffCreds(res.credentials);
      setStaffCredsOpen(true);
      showToast("Staff/Coordinator registered! Security credentials generated.", "success");

      loadAllData();
    } catch (err: any) {
      showToast(err.message || "Failed to register coordinator", "error");
    }
  };

  // Handle Add Site
  const handleAddSiteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteName) {
      showToast("Site name is required", "error");
      return;
    }

    try {
      await apiFetch("/api/sites", {
        method: "POST",
        body: JSON.stringify({
          name: siteName,
          depth_label: siteDepth,
          category: siteCategory
        })
      });

      setIsAddSiteOpen(false);
      setSiteName("");
      showToast("Site taxonomy added to directory", "success");
      loadAllData();
    } catch (err: any) {
      showToast(err.message || "Failed to save site", "error");
    }
  };

  // Delete Site
  const handleDeleteSite = async (siteId: string) => {
    if (!window.confirm("Are you sure you want to remove this site from the taxonomy? Active campaigns for this site might be affected.")) return;
    try {
      await apiFetch(`/api/sites/${siteId}`, {
        method: "DELETE"
      });
      showToast("Site removed from taxonomy directory", "warning");
      loadAllData();
    } catch (err: any) {
      showToast("Failed to delete site", "error");
    }
  };

  // Handle Bulk Reassign Coordinator
  const handleBulkReassignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reassignVolIds.length === 0 || !targetCoordId) return;

    try {
      await apiFetch("/api/volunteers/bulk-action", {
        method: "POST",
        body: JSON.stringify({
          volunteer_ids: reassignVolIds,
          action: "reassign",
          coordinator_id: targetCoordId
        })
      });

      setIsReassignOpen(false);
      setReassignVolIds([]);
      showToast(`Successfully reassigned ${reassignVolIds.length} volunteers to new coordinator.`, "success");
      loadAllData();
    } catch (err: any) {
      showToast("Reassignment failed", "error");
    }
  };

  // Bulk Deactivate selected
  const handleBulkDeactivate = async () => {
    if (reassignVolIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to deactivate ${reassignVolIds.length} selected volunteers? They will lose all console clearance.`)) return;

    try {
      await apiFetch("/api/volunteers/bulk-action", {
        method: "POST",
        body: JSON.stringify({
          volunteer_ids: reassignVolIds,
          action: "deactivate"
        })
      });

      setReassignVolIds([]);
      showToast("Deactivated selected profiles", "warning");
      loadAllData();
    } catch (err: any) {
      showToast("Bulk deactivation failed", "error");
    }
  };

  // Toggle volunteer checkbox selection for bulk actions
  const toggleVolSelection = (profileId: string) => {
    setReassignVolIds((prev) =>
      prev.includes(profileId) ? prev.filter((id) => id !== profileId) : [...prev, profileId]
    );
  };

  // CSV Export trigger mock
  const handleExportCSV = () => {
    if (volunteers.length === 0) return;
    
    // Create CSV content
    const headers = ["Name", "Code", "Email", "Phone", "Coordinator", "Site Preference", "Availability", "Hours", "Status"];
    const rows = volunteers.map(v => [
      v.profile.full_name,
      v.volunteer_code,
      v.profile.email,
      v.profile.phone,
      v.coordinator_name || "",
      v.site_preference,
      v.availability,
      v.hours_logged.toString(),
      v.status
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `OSI_Volunteer_Registry_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast("Master Volunteer CSV registry exported successfully", "success");
  };

  // Copy helper
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast("Credentials copied!", "success");
  };

  // Filter algorithm
  const filteredVolunteers = volunteers.filter((v) => {
    const matchesSearch = 
      v.profile.full_name.toLowerCase().includes(filterSearch.toLowerCase()) ||
      v.volunteer_code.toLowerCase().includes(filterSearch.toLowerCase()) ||
      v.profile.email.toLowerCase().includes(filterSearch.toLowerCase());
    
    const matchesCoord = filterCoordinator === "all" || v.coordinator_id === filterCoordinator;
    const matchesSite = filterSite === "all" || v.site_preference === filterSite;
    const matchesStatus = filterStatus === "all" || v.status === filterStatus;

    return matchesSearch && matchesCoord && matchesSite && matchesStatus;
  });

  // Calculate chart coordinates from stats
  const chartData = stats.volunteersByCoord ? Object.entries(stats.volunteersByCoord) : [];

  if (loading && staffList.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Waves className="w-10 h-10 text-cyan animate-spin mx-auto mb-4" />
          <p className="font-serif font-bold text-deep text-lg">Calibrating Admin Command Deck...</p>
          <p className="text-xs text-slate-400 mt-1">Summoning global registry streams and calculating chart analytics.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* Top Banner Control */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center shadow-xs">
        <div className="flex items-center gap-2.5">
          <Waves className="w-7 h-7 text-cyan animate-pulse" />
          <div>
            <span className="font-serif font-black text-deep text-base tracking-tight block leading-none">OCEAN SCHOOL INDIA</span>
            <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest block leading-none mt-0.5">Admin Control Center</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-right">
            <span className="text-xs font-bold text-deep block leading-none">{user?.full_name}</span>
            <span className="text-[10px] font-mono text-cyan font-bold uppercase tracking-wider block">Master Admin</span>
          </div>
          <Button variant="ghost" onClick={logout} className="text-xs font-semibold py-1.5 px-3">
            Sign Out
          </Button>
        </div>
      </header>

      {/* Admin layout structure */}
      <div className="flex-1 flex flex-col md:flex-row">
        
        {/* Left sidebar nav item controls */}
        <aside className="md:w-64 bg-white border-r border-slate-100 p-4 flex flex-col gap-1 shrink-0">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2 block">System Controls</span>
          <SidebarNavItem 
            label="Dashboard Stats" 
            icon={<Building2 className="w-4 h-4" />} 
            isActive={activeTab === "overview"} 
            onClick={() => setActiveTab("overview")} 
          />
          <SidebarNavItem 
            label="Staff Management" 
            icon={<Layers className="w-4 h-4" />} 
            isActive={activeTab === "staff"} 
            onClick={() => setActiveTab("staff")} 
          />
          <SidebarNavItem 
            label="Master Volunteers DB" 
            icon={<Users className="w-4 h-4" />} 
            isActive={activeTab === "volunteers"} 
            onClick={() => setActiveTab("volunteers")} 
          />
          <SidebarNavItem 
            label="Campaigns registry" 
            icon={<Calendar className="w-4 h-4" />} 
            isActive={activeTab === "campaigns"} 
            onClick={() => setActiveTab("campaigns")} 
          />
          <SidebarNavItem 
            label="System Config" 
            icon={<Settings className="w-4 h-4" />} 
            isActive={activeTab === "settings"} 
            onClick={() => setActiveTab("settings")} 
          />
        </aside>

        {/* Content body panel */}
        <main className="flex-1 p-6 md:p-8 min-w-0">
          
          {/* --- TAB: ADMIN OVERVIEW --- */}
          {activeTab === "overview" && (
            <div className="flex flex-col gap-8">
              
              {/* Stat strip card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                <Card title="Volunteers Pool" subtitle="Global registered" className="text-center">
                  <span className="font-serif font-black text-3xl text-navy">{stats.totalVolunteers}</span>
                </Card>
                <Card title="Staff Coordinators" subtitle="Regional unit leads" className="text-center">
                  <span className="font-serif font-black text-3xl text-navy">{stats.totalStaff}</span>
                </Card>
                <Card title="Active Campaigns" subtitle="Drive pools open" className="text-center">
                  <span className="font-serif font-black text-3xl text-navy">{stats.activeOpps}</span>
                </Card>
                <Card title="Restoration Hours" subtitle="Total credited" className="text-center">
                  <span className="font-serif font-black text-3xl text-navy">{stats.totalHours}h</span>
                </Card>
                <Card title="Sites Covered" subtitle="Active taxonomies" className="text-center">
                  <span className="font-serif font-black text-3xl text-navy">{stats.sitesCovered}</span>
                </Card>
              </div>

              {/* Chart & Action grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Visual SVG bar chart: Volunteers by coordinator */}
                <Card title="Volunteers by Coordinator" subtitle="Load distribution across unit leads" className="lg:col-span-2">
                  {chartData.length === 0 ? (
                    <EmptyState title="No metrics compiled" description="Add coordinators to begin tracking." />
                  ) : (
                    <div className="py-6">
                      {/* Responsive bar chart container */}
                      <div className="flex flex-col gap-5">
                        {chartData.map(([name, count]: any) => {
                          const maxCount = Math.max(...chartData.map(([_, c]: any) => c), 1);
                          const percentage = Math.round((count / maxCount) * 100);
                          return (
                            <div key={name} className="flex items-center gap-4 text-xs">
                              <span className="w-28 font-bold text-deep truncate">{name}</span>
                              <div className="flex-1 h-6 bg-slate-100 rounded-lg overflow-hidden flex items-center">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${percentage}%` }}
                                  transition={{ duration: 0.8, ease: "easeOut" }}
                                  className="h-full bg-navy flex items-center px-2 justify-end"
                                >
                                  {percentage > 10 && <span className="text-[10px] font-bold text-white leading-none">{count}</span>}
                                </motion.div>
                                {percentage <= 10 && <span className="text-[10px] font-bold text-slate-700 ml-2 leading-none">{count}</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </Card>

                {/* Activity Feed and Quick Coordinator actions */}
                <Card title="Master Activity Feed" subtitle="Real-time operations log (Read Only)" className="lg:col-span-1">
                  <div className="flex flex-col gap-4 max-h-[35vh] overflow-y-auto">
                    {activityLogs.length === 0 ? (
                      <EmptyState title="Logbook clear" description="System is operational." />
                    ) : (
                      activityLogs.slice(0, 10).map((log) => (
                        <div key={log.id} className="p-3 border border-slate-100 bg-slate-50 rounded-xl text-[11px] leading-relaxed relative">
                          <span className="font-bold text-deep block uppercase tracking-wider text-[9px] mb-0.5">{log.action_type}</span>
                          <p className="text-slate-600 font-sans">{log.description}</p>
                          <span className="text-[9px] text-slate-400 font-mono block mt-1">
                            {new Date(log.created_at).toLocaleString()}
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="border-t border-slate-100 mt-5 pt-4">
                    <Button onClick={() => setIsAddStaffOpen(true)} className="w-full text-xs py-2">
                      <Plus className="w-4 h-4" />
                      Add Coordinator Staff
                    </Button>
                  </div>
                </Card>

              </div>
            </div>
          )}

          {/* --- TAB: STAFF MANAGEMENT --- */}
          {activeTab === "staff" && (
            <Card title="Coordinator Staff Directory" subtitle="System coordinators cleared for volunteer registration.">
              <div className="flex justify-between items-center mb-6">
                <span className="text-xs font-mono font-bold text-slate-400 uppercase">ACTIVE UNITS: {staffList.length}</span>
                <Button onClick={() => setIsAddStaffOpen(true)} className="text-xs py-2">
                  <Plus className="w-4 h-4" />
                  Add New Coordinator
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-mono uppercase tracking-wider">
                      <th className="py-2.5">Staff Name</th>
                      <th className="py-2.5">Email / Phone</th>
                      <th className="py-2.5">Assigned Region</th>
                      <th className="py-2.5">Active Load</th>
                      <th className="py-2.5 text-right"> Clearance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffList.map((st) => (
                      <tr key={st.profile.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition">
                        <td className="py-3 font-bold text-deep flex items-center gap-2">
                          <Avatar name={st.profile.full_name} size="sm" />
                          {st.profile.full_name}
                        </td>
                        <td className="py-3">
                          <span className="block text-slate-700 font-medium">{st.profile.email}</span>
                          <span className="block text-slate-400 mt-0.5">{st.profile.phone}</span>
                        </td>
                        <td className="py-3 font-semibold text-slate-600">{st.details.assigned_region}</td>
                        <td className="py-3 font-black text-navy">{st.volunteer_count} volunteers</td>
                        <td className="py-3 text-right">
                          <Badge status="active" label="Cleared" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* --- TAB: MASTER VOLUNTEER DB --- */}
          {activeTab === "volunteers" && (
            <div className="flex flex-col gap-6">
              
              {/* Master filter widget */}
              <div className="bg-white p-5 border border-slate-100 rounded-xl flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                  <Input
                    label="Search Directory"
                    placeholder="Search name, code, email..."
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                  />
                </div>

                <div className="w-full sm:w-48">
                  <Select
                    label="Filter Coordinator"
                    value={filterCoordinator}
                    onChange={(e) => setFilterCoordinator(e.target.value)}
                    options={[
                      { value: "all", label: "All Coordinators" },
                      ...staffList.map(st => ({ value: st.profile.id, label: st.profile.full_name }))
                    ]}
                  />
                </div>

                <div className="w-full sm:w-48">
                  <Select
                    label="Filter Site"
                    value={filterSite}
                    onChange={(e) => setFilterSite(e.target.value)}
                    options={[
                      { value: "all", label: "All Locations" },
                      ...sites.map(s => ({ value: s.name, label: s.name }))
                    ]}
                  />
                </div>

                <div className="w-full sm:w-36">
                  <Select
                    label="Filter Status"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    options={[
                      { value: "all", label: "All Status" },
                      { value: "active", label: "Active" },
                      { value: "pending", label: "Pending" },
                      { value: "inactive", label: "Inactive" }
                    ]}
                  />
                </div>

                <Button variant="secondary" onClick={handleExportCSV} className="text-xs py-2 px-3">
                  <FileSpreadsheet className="w-4 h-4" />
                  Export CSV
                </Button>
              </div>

              {/* Bulk operations bar */}
              {reassignVolIds.length > 0 && (
                <div className="bg-navy text-white p-4 rounded-xl flex flex-wrap justify-between items-center gap-4 shadow-sm animate-pulse">
                  <span className="text-xs font-bold font-mono">SELECTED: {reassignVolIds.length} profiles</span>
                  <div className="flex gap-2">
                    <Button variant="danger" onClick={handleBulkDeactivate} className="text-[11px] py-1.5 px-3">
                      Deactivate cleared
                    </Button>
                    <Button onClick={() => setIsReassignOpen(true)} className="text-[11px] py-1.5 px-3">
                      Reassign coordinator
                    </Button>
                  </div>
                </div>
              )}

              {/* Master Volunteers Roster */}
              <Card title="Master Volunteers Registry" subtitle={`Showing matches: ${filteredVolunteers.length}`}>
                {filteredVolunteers.length === 0 ? (
                  <EmptyState title="No matching directory" description="Adjust your search or filter parameters." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 font-mono uppercase tracking-wider">
                          <th className="py-2.5 px-2">
                            <input
                              type="checkbox"
                              checked={reassignVolIds.length === filteredVolunteers.length}
                              onChange={() => {
                                if (reassignVolIds.length === filteredVolunteers.length) {
                                  setReassignVolIds([]);
                                } else {
                                  setReassignVolIds(filteredVolunteers.map(v => v.profile_id));
                                }
                              }}
                              className="w-3.5 h-3.5 rounded border-slate-300 text-cyan focus:ring-cyan"
                            />
                          </th>
                          <th className="py-2.5">Name</th>
                          <th className="py-2.5">Code</th>
                          <th className="py-2.5">Coordinator Staff</th>
                          <th className="py-2.5">Site Preference</th>
                          <th className="py-2.5">Hours</th>
                          <th className="py-2.5">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredVolunteers.map((vol) => (
                          <tr key={vol.profile_id} className="border-b border-slate-50 hover:bg-slate-50/50 transition">
                            <td className="py-3 px-2">
                              <input
                                type="checkbox"
                                checked={reassignVolIds.includes(vol.profile_id)}
                                onChange={() => toggleVolSelection(vol.profile_id)}
                                className="w-3.5 h-3.5 rounded border-slate-300 text-cyan focus:ring-cyan"
                              />
                            </td>
                            <td className="py-3 font-bold text-deep flex items-center gap-2">
                              <Avatar name={vol.profile.full_name} size="sm" />
                              {vol.profile.full_name}
                            </td>
                            <td className="py-3 font-mono font-bold text-slate-400">{vol.volunteer_code}</td>
                            <td className="py-3 font-semibold text-slate-600">{vol.coordinator_name}</td>
                            <td className="py-3 text-slate-500 font-medium">{vol.site_preference}</td>
                            <td className="py-3 font-black text-slate-700">{vol.hours_logged}h</td>
                            <td className="py-3"><Badge status={vol.status} className="text-[10px]" /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>

            </div>
          )}

          {/* --- TAB: CAMPAIGNS --- */}
          {activeTab === "campaigns" && (
            <Card title="Global Campaigns Oversight" subtitle="Review active, completed, or cancelled drives across the entire ecosystem.">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-mono uppercase tracking-wider">
                      <th className="py-2.5">Drive Title</th>
                      <th className="py-2.5">Sector</th>
                      <th className="py-2.5">Target Date</th>
                      <th className="py-2.5">Log Load</th>
                      <th className="py-2.5">Campaign Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {opportunities.map((opp) => (
                      <tr key={opp.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition">
                        <td className="py-3.5">
                          <span className="font-bold text-deep block leading-tight">{opp.title}</span>
                          <span className="text-[10px] text-slate-400 font-mono block mt-1">COMMITMENT: {opp.commitment_label}</span>
                        </td>
                        <td className="py-3.5 font-semibold text-slate-600">{opp.site?.name}</td>
                        <td className="py-3.5 text-slate-500">{opp.date}</td>
                        <td className="py-3.5 font-mono font-bold text-slate-400">{opp.signup_count}/{opp.capacity} registered</td>
                        <td className="py-3.5">
                          <Badge status={opp.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* --- TAB: CONFIG & SETTINGS --- */}
          {activeTab === "settings" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Site database editor */}
              <Card title="Manage Sites Directory" subtitle="Maintain the master taxonomies of active coastal sectors" className="lg:col-span-2">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">ACTIVE SITES: {sites.length}</span>
                  <Button onClick={() => setIsAddSiteOpen(true)} className="text-xs py-1.5 px-3">
                    <Plus className="w-4 h-4" />
                    Add Site Sector
                  </Button>
                </div>

                <div className="flex flex-col gap-3 max-h-[50vh] overflow-y-auto">
                  {sites.map((site) => (
                    <div key={site.id} className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center text-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-cyan/10 flex items-center justify-center shrink-0">
                          <MapPin className="w-4 h-4 text-cyan" />
                        </div>
                        <div>
                          <span className="font-bold text-deep block">{site.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono block mt-0.5">{site.category} — DESCENT DEPTH: {site.depth_label}</span>
                        </div>
                      </div>
                      
                      <button onClick={() => handleDeleteSite(site.id)} className="p-1 text-slate-400 hover:text-coral transition focus:outline-none cursor-pointer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Branding and trust information details */}
              <Card title="Ocean Registry Credentialing" subtitle="System accreditation properties" className="lg:col-span-1 text-xs">
                <div className="flex flex-col gap-4 text-slate-600 leading-relaxed">
                  <div className="p-3 bg-sky-50 rounded-lg border border-sky-100">
                    <span className="font-bold text-sky-800 block mb-1">Environmental Trust No. RA-88442</span>
                    <p className="text-[11px] text-sky-700">Registered with Mumbai-Lakshadweep Joint Marine Protection Framework. All digital hours log entries serve as certified social work credentials.</p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Assigned Security Framework</span>
                    <p className="font-medium text-deep">Supabase Postgres Database engine with server-side Row-Level Security (RLS) filters validated.</p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Registered Trust Offices</span>
                    <p className="font-medium text-deep">Vashi Outreach Station, Navi Mumbai</p>
                    <p className="font-medium text-deep mt-0.5">Agatti Marine Depot, Lakshadweep Islands</p>
                  </div>
                </div>
              </Card>

            </div>
          )}

        </main>
      </div>

      {/* --- MODAL: ADD STAFF COORDINATOR --- */}
      <Modal isOpen={isAddStaffOpen} onClose={() => setIsAddStaffOpen(false)} title="Register Coordinator Staff">
        <form onSubmit={handleAddStaffSubmit} className="flex flex-col gap-4">
          <Input
            label="Staff Full Name"
            placeholder="E.g. Amit Rao"
            value={staffName}
            onChange={(e) => setStaffName(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Staff Email Address"
              type="email"
              placeholder="name@oceanschool.org"
              value={staffEmail}
              onChange={(e) => setStaffEmail(e.target.value)}
              required
            />

            <Input
              label="Staff Phone Number"
              placeholder="+91 XXXXX XXXXX"
              value={staffPhone}
              onChange={(e) => setStaffPhone(e.target.value)}
              required
            />
          </div>

          <Select
            label="Assigned Operations Region"
            value={staffRegion}
            onChange={(e) => setStaffRegion(e.target.value)}
            options={[
              { value: "Navi Mumbai", label: "Navi Mumbai Estuary Office" },
              { value: "Lakshadweep", label: "Lakshadweep Islands Base" }
            ]}
          />

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={() => setIsAddStaffOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Register Staff Unit
            </Button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL: STAFF CONFIRM CREDENTIALS --- */}
      <Modal isOpen={staffCredsOpen} onClose={() => setStaffCredsOpen(false)} title="Coordinator Security Pass Generated">
        {createdStaffCreds && (
          <div className="flex flex-col gap-4 text-xs">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 flex gap-3 text-emerald-800 leading-relaxed mb-2">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
              <div>
                <span className="font-bold">Staff credentials verified!</span> Copy this secure entry pass to the coordinator so they can login to the console.
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 font-mono text-slate-600 select-all flex flex-col gap-2">
              <div>
                <span className="font-bold text-deep">Coordinator Email ID:</span> {createdStaffCreds.email}
              </div>
              <div>
                <span className="font-bold text-deep">Temporary Password:</span> {createdStaffCreds.password}
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-4">
              <Button variant="ghost" onClick={() => setStaffCredsOpen(false)}>
                Close Console
              </Button>
              <Button onClick={() => copyToClipboard(`Ocean School Coordinator Security Pass\nID: ${createdStaffCreds.email}\nPass: ${createdStaffCreds.password}`)}>
                Copy Credentials Slip
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* --- MODAL: ADD SITE TAXONOMY --- */}
      <Modal isOpen={isAddSiteOpen} onClose={() => setIsAddSiteOpen(false)} title="Add Site Sector Taxonomy">
        <form onSubmit={handleAddSiteSubmit} className="flex flex-col gap-4">
          <Input
            label="Sector Name"
            placeholder="E.g. Nerul Mangrove Buffer..."
            value={siteName}
            onChange={(e) => setSiteName(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Calibration Depth Level"
              value={siteDepth}
              onChange={(e) => setSiteDepth(e.target.value)}
              options={[
                { value: "5m", label: "5m Depth Gauge" },
                { value: "15m", label: "15m Depth Gauge" },
                { value: "25m", label: "25m Depth Gauge" },
                { value: "40m", label: "40m Depth Gauge" }
              ]}
            />

            <Select
              label="Ecosystem Category"
              value={siteCategory}
              onChange={(e) => setSiteCategory(e.target.value)}
              options={[
                { value: "Creek", label: "Creek" },
                { value: "Mangroves", label: "Mangroves" },
                { value: "Lake", label: "Lake" },
                { value: "Hills", label: "Hills" },
                { value: "Dive Center", label: "Dive Center" }
              ]}
            />
          </div>

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={() => setIsAddSiteOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Publish Sector
            </Button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL: REASSIGN VOLUNTEERS --- */}
      <Modal isOpen={isReassignOpen} onClose={() => setIsReassignOpen(false)} title="Reassign Coordinator Unit">
        <form onSubmit={handleBulkReassignSubmit} className="flex flex-col gap-4">
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 flex gap-2 text-amber-800 text-xs">
            <AlertTriangle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
            <span>This will reassign {reassignVolIds.length} checked volunteers to the designated coordinator immediately.</span>
          </div>

          <Select
            label="Designate Coordinator Staff"
            value={targetCoordId}
            onChange={(e) => setTargetCoordId(e.target.value)}
            options={staffList.map(st => ({ value: st.profile.id, label: st.profile.full_name }))}
          />

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={() => setIsReassignOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Complete Reassignment
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
