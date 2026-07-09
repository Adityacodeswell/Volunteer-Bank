import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Building2, Users, Map, Clock, Calendar, Search, Plus, 
  Trash2, Mail, Phone, MapPin, Award, ArrowRight, ShieldCheck, 
  CheckCircle2, FileSpreadsheet, Settings, AlertTriangle, 
  Sparkles, RefreshCw, Layers, MapPinOff, UserMinus, ToggleLeft, ToggleRight, Waves, Menu, X
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
import { supabase, SUPABASE_URL, SUPABASE_PUBLIC_KEY } from "../supabaseClient";
import { createClient } from "@supabase/supabase-js";

function SkeletonCard() {
  return (
    <div className="animate-pulse bg-white border border-slate-100 rounded-xl p-5 flex flex-col gap-4 w-full">
      <div className="h-4 bg-slate-200 rounded w-1/4"></div>
      <div className="h-6 bg-slate-200 rounded w-3/4"></div>
      <div className="h-4 bg-slate-200 rounded w-5/6"></div>
      <div className="flex gap-2 mt-2">
        <div className="h-8 bg-slate-200 rounded w-1/2"></div>
      </div>
    </div>
  );
}

function InlineError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="p-6 bg-red-50 border border-red-100 rounded-xl text-center my-4">
      <AlertTriangle className="w-10 h-10 text-coral mx-auto mb-3" />
      <h3 className="font-bold text-sm text-red-800">Connection Failed</h3>
      <p className="text-xs text-red-600 mt-1 mb-4">{message}</p>
      <Button variant="danger" onClick={onRetry} className="text-xs py-2 px-4">
        Try Reconnecting
      </Button>
    </div>
  );
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<"overview" | "staff" | "volunteers" | "campaigns" | "settings">("overview");
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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

  // Destructive confirmations
  const [isDeleteSiteConfirmOpen, setIsDeleteSiteConfirmOpen] = useState(false);
  const [siteToDelete, setSiteToDelete] = useState<string | null>(null);

  const [isDeactivateBulkConfirmOpen, setIsDeactivateBulkConfirmOpen] = useState(false);

  // Filter states - Master DB
  const [filterSearch, setFilterSearch] = useState("");
  const [filterCoordinator, setFilterCoordinator] = useState("all");
  const [filterSite, setFilterSite] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Reassign coordinator action state
  const [reassignVolIds, setReassignVolIds] = useState<string[]>([]);
  const [targetCoordId, setTargetCoordId] = useState("");
  const [isReassignSubmitting, setIsReassignSubmitting] = useState(false);

  // Add staff/account form state
  const [staffName, setStaffName] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPhone, setStaffPhone] = useState("");
  const [staffRegion, setStaffRegion] = useState("Navi Mumbai");
  const [staffPassword, setStaffPassword] = useState("");
  const [staffRole, setStaffRole] = useState<"admin" | "staff" | "volunteer">("staff");
  const [staffSitePref, setStaffSitePref] = useState("");
  const [isSubmittingStaff, setIsSubmittingStaff] = useState(false);

  // Add site form state
  const [siteName, setSiteName] = useState("");
  const [siteDepth, setSiteDepth] = useState("5m");
  const [siteCategory, setSiteCategory] = useState("Creek");
  const [isSubmittingSite, setIsSubmittingSite] = useState(false);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    setErrorState(null);
    try {
      // 1. Fetch profiles where role = 'staff'
      const { data: staffData, error: staffErr } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "staff");

      if (staffErr) throw new Error(staffErr.message);

      // 2. Fetch volunteers join profiles
      const { data: volsData, error: volsErr } = await supabase
        .from("volunteers")
        .select("*, profile:profiles!volunteers_profile_id_fkey(*), site:sites(name)")
        .order("created_at", { ascending: false });

      if (volsErr) throw new Error(volsErr.message);

      // Fetch coordinators names map
      const { data: coordProfiles, error: coordProfilesErr } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", volsData ? volsData.map(v => v.coordinator_id).filter(Boolean) : []);

      if (coordProfilesErr) throw new Error(coordProfilesErr.message);

      const coordMap = (coordProfiles || []).reduce((acc: any, p: any) => {
        acc[p.id] = p.full_name;
        return acc;
      }, {});

      const mappedVols: VolunteerWithProfile[] = (volsData || [])
        .filter(v => v && v.profile)
        .map(v => ({
          ...v,
          profile: v.profile,
          site_name: v.site?.name,
          site_preference: v.site?.name || "General Support",
          coordinator_name: coordMap[v.coordinator_id] || "Unassigned"
        }));

      // 3. Fetch opportunities join sites
      const { data: oppsData, error: oppsErr } = await supabase
        .from("opportunities")
        .select("*, site:sites(name)")
        .order("date");

      if (oppsErr) throw new Error(oppsErr.message);

      // Fetch signups
      const { data: allSignups, error: signupsErr } = await supabase
        .from("opportunity_signups")
        .select("opportunity_id");

      if (signupsErr) throw new Error(signupsErr.message);

      const signupCounts = (allSignups || []).reduce((acc: any, s: any) => {
        acc[s.opportunity_id] = (acc[s.opportunity_id] || 0) + 1;
        return acc;
      }, {});

      const mappedOpps: OpportunityWithSite[] = (oppsData || []).map(o => ({
        ...o,
        signup_count: signupCounts[o.id] || 0,
        site: o.site
      }));

      // 4. Fetch sites
      const { data: sitesData, error: sitesErr } = await supabase
        .from("sites")
        .select("*")
        .order("name");

      if (sitesErr) throw new Error(sitesErr.message);

      // 5. Fetch logs
      const { data: logsData, error: logsErr } = await supabase
        .from("activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);

      const mappedLogs: ActivityLog[] = logsData || [];

      // Structure StaffListWithProfile
      const mappedStaff: StaffWithProfile[] = (staffData || [])
        .filter(s => s && s.id)
        .map(s => {
          const count = mappedVols.filter(v => v && v.coordinator_id === s.id).length;
          return {
            profile: s,
            details: {
              profile_id: s.id,
              assigned_region: s.email && s.email.includes("amit") ? "Lakshadweep" : "Navi Mumbai",
              created_by_admin_id: user?.id || ""
            },
            volunteer_count: count
          };
        });

      // Calculate totals
      const totalVols = mappedVols.length;
      const totalSt = mappedStaff.length;
      const activeOpps = mappedOpps.filter(o => o.status === "open").length;
      const totalHrs = mappedVols.reduce((sum, v) => sum + (v.hours_logged || 0), 0);
      const sitesCount = (sitesData || []).length;

      const volunteersByCoord: Record<string, number> = {};
      mappedStaff.forEach(s => {
        const coordName = s.profile?.full_name || "Unknown Coordinator";
        volunteersByCoord[coordName] = s.volunteer_count;
      });

      setVolunteers(mappedVols);
      setOpportunities(mappedOpps);
      setSites(sitesData || []);
      setActivityLogs(mappedLogs);
      setStaffList(mappedStaff);

      if (mappedStaff.length > 0 && mappedStaff[0]?.profile) {
        setTargetCoordId(mappedStaff[0].profile.id);
      }

      setStats({
        totalVolunteers: totalVols,
        totalStaff: totalSt,
        activeOpps,
        totalHours: totalHrs,
        sitesCovered: sitesCount,
        volunteersByCoord,
        recentLogs: mappedLogs.slice(0, 10)
      });

    } catch (err: any) {
      setErrorState(err.message || "Failed to load master admin metrics");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Add User Account (Task 6)
  const handleAddStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffName || !staffEmail || !staffPhone || !staffPassword || !staffRole) {
      showToast("Please enter all required registration details", "error");
      return;
    }

    setIsSubmittingStaff(true);
    try {
      // Create a temporary non-persisted client to sign up the new user 
      // without logging out the currently active Admin session!
      const tempClient = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      });

      // 1. Sign up the new user via Supabase Auth using the temporary client
      const { data: authData, error: authErr } = await tempClient.auth.signUp({
        email: staffEmail,
        password: staffPassword,
      });

      if (authErr) throw new Error(authErr.message);
      if (!authData.user) throw new Error("Could not create authentication profile");

      // 2. Create profile row using the newly logged-in tempClient to satisfy RLS (auth.uid() = id)
      const { error: profileErr } = await tempClient.from("profiles").insert({
        id: authData.user.id,
        role: staffRole,
        full_name: staffName,
        email: staffEmail,
        phone: staffPhone,
        must_reset_password: false
      });

      if (profileErr) throw new Error(profileErr.message);

      // 3. Create volunteer row if registering a volunteer
      if (staffRole === "volunteer") {
        const volCode = `OSI-VOL-${String(Math.floor(1000 + Math.random() * 9000))}`;
        const { error: volErr } = await tempClient.from("volunteers").insert({
          profile_id: authData.user.id,
          coordinator_id: null,
          site_preference_id: staffSitePref || null,
          interests: [],
          availability: "Weekend warrior",
          how_heard: "Admin registered",
          status: "pending",
          hours_logged: 0,
          volunteer_code: volCode,
          emergency_contact: ""
        });

        if (volErr) throw new Error(volErr.message);
      }

      // 4. Log Action using the Admin's main supabase client (which remained logged in!)
      await supabase.from("activity_log").insert({
        profile_id: user!.id,
        action_type: "ACCOUNT_CREATED",
        description: `Admin created ${staffRole} account for ${staffName} (${staffEmail})`
      });

      // Reset form states
      setIsAddStaffOpen(false);
      setStaffName("");
      setStaffEmail("");
      setStaffPhone("");
      setStaffPassword("");
      setStaffRole("staff");
      setStaffSitePref("");

      showToast(`Account successfully registered for ${staffName}!`, "success");

      loadAllData();
    } catch (err: any) {
      showToast(err.message || "Failed to register user account", "error");
    } finally {
      setIsSubmittingStaff(false);
    }
  };

  // Add site taxonomy
  const handleAddSiteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteName.trim()) {
      showToast("Site name is required", "error");
      return;
    }

    setIsSubmittingSite(true);
    try {
      const { error } = await supabase.from("sites").insert({
        name: siteName.trim(),
        depth_label: siteDepth,
        category: siteCategory
      });

      if (error) throw new Error(error.message);

      // Log action
      await supabase.from("activity_log").insert({
        profile_id: user!.id,
        action_type: "SITE_CREATED",
        description: `Added site taxonomy: ${siteName}`
      });

      setIsAddSiteOpen(false);
      setSiteName("");
      showToast("Site taxonomy added to directory", "success");
      loadAllData();
    } catch (err: any) {
      showToast(err.message || "Failed to save site", "error");
    } finally {
      setIsSubmittingSite(false);
    }
  };

  // Delete Site confirm
  const handleDeleteSiteConfirm = async () => {
    if (!siteToDelete) return;
    try {
      const { error } = await supabase
        .from("sites")
        .delete()
        .eq("id", siteToDelete);

      if (error) throw new Error(error.message);

      // Log action
      await supabase.from("activity_log").insert({
        profile_id: user!.id,
        action_type: "SITE_DELETED",
        description: `Removed site taxonomy ID: ${siteToDelete}`
      });

      showToast("Site removed from taxonomy directory", "warning");
      setIsDeleteSiteConfirmOpen(false);
      setSiteToDelete(null);
      loadAllData();
    } catch (err: any) {
      showToast("Failed to delete site", "error");
    }
  };

  // Bulk Reassign coordinator
  const handleBulkReassignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reassignVolIds.length === 0 || !targetCoordId) return;

    setIsReassignSubmitting(true);
    try {
      const { error } = await supabase
        .from("volunteers")
        .update({ coordinator_id: targetCoordId })
        .in("profile_id", reassignVolIds);

      if (error) throw new Error(error.message);

      const designatedName = staffList.find(s => s?.profile?.id === targetCoordId)?.profile?.full_name || "New Coordinator";
      await supabase.from("activity_log").insert({
        profile_id: user!.id,
        action_type: "BULK_REASSIGN",
        description: `Bulk-reassigned ${reassignVolIds.length} volunteers to coordinator: ${designatedName}`
      });

      setIsReassignOpen(false);
      setReassignVolIds([]);
      showToast(`Successfully reassigned ${reassignVolIds.length} volunteers.`, "success");
      loadAllData();
    } catch (err: any) {
      showToast("Reassignment failed", "error");
    } finally {
      setIsReassignSubmitting(false);
    }
  };

  // Bulk Deactivate profiles
  const handleBulkDeactivateConfirm = async () => {
    if (reassignVolIds.length === 0) return;

    try {
      const { error } = await supabase
        .from("volunteers")
        .update({ status: "inactive" })
        .in("profile_id", reassignVolIds);

      if (error) throw new Error(error.message);

      await supabase.from("activity_log").insert({
        profile_id: user!.id,
        action_type: "BULK_DEACTIVATE",
        description: `Bulk-deactivated ${reassignVolIds.length} volunteer profiles`
      });

      setReassignVolIds([]);
      setIsDeactivateBulkConfirmOpen(false);
      showToast("Deactivated selected profiles", "warning");
      loadAllData();
    } catch (err: any) {
      showToast("Bulk deactivation failed", "error");
    }
  };

  const toggleVolSelection = (profileId: string) => {
    setReassignVolIds((prev) =>
      prev.includes(profileId) ? prev.filter((id) => id !== profileId) : [...prev, profileId]
    );
  };

  const handleExportCSV = () => {
    if (volunteers.length === 0) return;
    
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast("Credentials copied!", "success");
  };

  // Filtering
  const filteredVolunteers = volunteers
    .filter((v) => v && v.profile)
    .filter((v) => {
      const fullName = v.profile?.full_name || "Unknown User";
      const email = v.profile?.email || "";
      const volunteerCode = v.volunteer_code || "";
      
      const matchesSearch = 
        fullName.toLowerCase().includes(filterSearch.toLowerCase()) ||
        volunteerCode.toLowerCase().includes(filterSearch.toLowerCase()) ||
        email.toLowerCase().includes(filterSearch.toLowerCase());
      
      const matchesCoord = filterCoordinator === "all" || v.coordinator_id === filterCoordinator;
      const matchesSite = filterSite === "all" || v.site_preference === filterSite;
      const matchesStatus = filterStatus === "all" || v.status === filterStatus;

      return matchesSearch && matchesCoord && matchesSite && matchesStatus;
    });

  const chartData = stats.volunteersByCoord ? Object.entries(stats.volunteersByCoord) : [];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* Top Banner Control */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center shadow-xs">
        <div className="flex items-center gap-2.5">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="md:hidden p-2 hover:bg-slate-50 rounded-lg text-deep"
          >
            <Menu className="w-6 h-6" />
          </button>
          <Waves className="w-7 h-7 text-cyan animate-pulse shrink-0" />
          <div>
            <span className="font-serif font-black text-deep text-base tracking-tight block leading-none">OCEAN SCHOOL INDIA</span>
            <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest block leading-none mt-0.5">Admin Control Center</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-right hidden sm:flex">
            <div>
              <span className="text-xs font-bold text-deep block leading-none">{user?.full_name}</span>
              <span className="text-[10px] font-mono text-cyan font-bold uppercase tracking-wider block mt-1">Master Admin</span>
            </div>
          </div>
          <Button variant="ghost" onClick={logout} className="text-xs font-semibold py-3 px-4 min-h-[44px]">
            Sign Out
          </Button>
        </div>
      </header>

      {/* Admin layout structure */}
      <div className="flex-1 flex flex-col md:flex-row relative">
        
        {/* MOBILE SIDEBAR OVERLAY */}
        <AnimatePresence>
          {isSidebarOpen && (
            <div className="fixed inset-0 z-50 md:hidden">
              <div 
                className="fixed inset-0 bg-deep/40 backdrop-blur-xs"
                onClick={() => setIsSidebarOpen(false)}
              />
              <motion.aside 
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", duration: 0.4 }}
                className="fixed left-0 top-0 bottom-0 w-64 bg-white p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-2">
                      <Waves className="w-6 h-6 text-cyan" />
                      <span className="font-serif font-bold text-deep text-sm">OSI Admin</span>
                    </div>
                    <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-slate-50 rounded-full">
                      <X className="w-5 h-5 text-slate-400" />
                    </button>
                  </div>

                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2 block">System Controls</span>
                  <div className="flex flex-col gap-1.5">
                    {[
                      { tab: "overview", label: "Dashboard Stats", icon: <Building2 className="w-4 h-4" /> },
                      { tab: "staff", label: "Staff Management", icon: <Layers className="w-4 h-4" /> },
                      { tab: "volunteers", label: "Master Volunteers DB", icon: <Users className="w-4 h-4" /> },
                      { tab: "campaigns", label: "Campaigns Registry", icon: <Calendar className="w-4 h-4" /> },
                      { tab: "settings", label: "System Config", icon: <Settings className="w-4 h-4" /> }
                    ].map(t => (
                      <SidebarNavItem
                        key={t.tab}
                        label={t.label}
                        icon={t.icon}
                        isActive={activeTab === t.tab}
                        onClick={() => { setActiveTab(t.tab as any); setIsSidebarOpen(false); }}
                      />
                    ))}
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4 text-xs text-slate-400 leading-relaxed font-semibold">
                  Secure Admin Node
                </div>
              </motion.aside>
            </div>
          )}
        </AnimatePresence>

        {/* PERSISTENT DESKTOP LEFT SIDEBAR */}
        <aside className="hidden md:flex md:w-64 bg-white border-r border-slate-100 p-4 flex flex-col gap-1 shrink-0 h-calc sticky top-24">
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
            label="Campaigns Registry" 
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
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
          
          {errorState ? (
            <InlineError message={errorState} onRetry={loadAllData} />
          ) : loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
              >
                
                {/* --- TAB: ADMIN OVERVIEW --- */}
                {activeTab === "overview" && (
                  <div className="flex flex-col gap-8">
                    
                    {/* Stat strip card */}
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
                      <Card title="Volunteers Pool" subtitle="Global registered" className="text-center">
                        <span className="font-serif font-black text-3xl text-navy">{stats.totalVolunteers}</span>
                      </Card>
                      <Card title="Staff Coordinators" subtitle="Regional leads" className="text-center">
                        <span className="font-serif font-black text-3xl text-navy">{stats.totalStaff}</span>
                      </Card>
                      <Card title="Active Campaigns" subtitle="Drives open" className="text-center">
                        <span className="font-serif font-black text-3xl text-navy">{stats.activeOpps}</span>
                      </Card>
                      <Card title="Restoration Hours" subtitle="Approved logs" className="text-center">
                        <span className="font-serif font-black text-3xl text-navy">{stats.totalHours}h</span>
                      </Card>
                      <Card title="Sites Covered" subtitle="Active sectors" className="text-center">
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
                          <Button onClick={() => setIsAddStaffOpen(true)} className="w-full text-xs py-3 px-4 min-h-[44px]">
                            <Plus className="w-4 h-4" />
                            Register New User Account
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
                      <Button onClick={() => setIsAddStaffOpen(true)} className="text-xs py-3 px-4 min-h-[44px]">
                        <Plus className="w-4 h-4" />
                        Register New User
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
                          className="py-3"
                        />
                      </div>

                      <div className="w-full sm:w-48">
                        <Select
                          label="Filter Coordinator"
                          value={filterCoordinator}
                          onChange={(e) => setFilterCoordinator(e.target.value)}
                          options={[
                            { value: "all", label: "All Coordinators" },
                            ...staffList
                              .filter(st => st && st.profile)
                              .map(st => ({
                                value: st.profile?.id || "",
                                label: st.profile?.full_name || "Unknown User"
                              }))
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

                      <Button variant="secondary" onClick={handleExportCSV} className="text-xs py-3 px-4 min-h-[44px]">
                        <FileSpreadsheet className="w-4 h-4" />
                        Export CSV
                      </Button>
                    </div>

                    {/* Bulk operations bar */}
                    {reassignVolIds.length > 0 && (
                      <div className="bg-navy text-white p-4 rounded-xl flex flex-wrap justify-between items-center gap-4 shadow-sm">
                        <span className="text-xs font-bold font-mono">SELECTED: {reassignVolIds.length} profiles</span>
                        <div className="flex gap-2">
                          <Button 
                            variant="danger" 
                            onClick={() => setIsDeactivateBulkConfirmOpen(true)} 
                            className="text-[11px] py-2 px-3 min-h-[36px]"
                          >
                            Deactivate Selected
                          </Button>
                          <Button 
                            onClick={() => setIsReassignOpen(true)} 
                            className="text-[11px] py-2 px-3 min-h-[36px]"
                          >
                            Reassign Coordinator
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
                              <td className="py-3.5 font-semibold text-slate-600">{opp.site?.name || "General Support"}</td>
                              <td className="py-3.5 text-slate-500">{new Date(opp.date).toLocaleDateString()}</td>
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
                        <Button onClick={() => setIsAddSiteOpen(true)} className="text-xs py-3 px-4 min-h-[44px]">
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
                            
                            <button 
                              onClick={() => { setSiteToDelete(site.id); setIsDeleteSiteConfirmOpen(true); }} 
                              className="p-2 text-slate-400 hover:text-coral transition focus:outline-none cursor-pointer min-h-[44px] min-w-[44px]"
                            >
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

              </motion.div>
            </AnimatePresence>
          )}
        </main>
      </div>

      {/* --- MODAL: REGISTER USER ACCOUNT --- */}
      <Modal isOpen={isAddStaffOpen} onClose={() => setIsAddStaffOpen(false)} title="Register User Account">
        <form onSubmit={handleAddStaffSubmit} className="flex flex-col gap-4">
          <Input
            label="Full Name *"
            placeholder="E.g. Amit Rao"
            value={staffName}
            onChange={(e) => setStaffName(e.target.value)}
            className="py-3"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Email Address *"
              type="email"
              placeholder="user@example.com"
              value={staffEmail}
              onChange={(e) => setStaffEmail(e.target.value)}
              className="py-3"
              required
            />

            <Input
              label="Phone Number *"
              placeholder="+91 XXXXX XXXXX"
              value={staffPhone}
              onChange={(e) => setStaffPhone(e.target.value)}
              className="py-3"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Account Password *"
              type="password"
              placeholder="Establish secure password"
              value={staffPassword}
              onChange={(e) => setStaffPassword(e.target.value)}
              className="py-3"
              required
            />

            <Select
              label="Account Role *"
              value={staffRole}
              onChange={(e) => setStaffRole(e.target.value as any)}
              options={[
                { value: "admin", label: "Admin" },
                { value: "staff", label: "Staff Coordinator" },
                { value: "volunteer", label: "Volunteer" }
              ]}
            />
          </div>

          {staffRole === "staff" && (
            <Select
              label="Assigned Operations Region *"
              value={staffRegion}
              onChange={(e) => setStaffRegion(e.target.value)}
              options={[
                { value: "Navi Mumbai", label: "Navi Mumbai Estuary Office" },
                { value: "Lakshadweep", label: "Lakshadweep Islands Base" }
              ]}
            />
          )}

          {staffRole === "volunteer" && (
            <Select
              label="Preferred Coastal Sector Site"
              value={staffSitePref}
              onChange={(e) => setStaffSitePref(e.target.value)}
              options={[
                { value: "", label: "No Preference (General Support)" },
                ...sites.map(s => ({ value: s.id, label: s.name }))
              ]}
            />
          )}

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={() => setIsAddStaffOpen(false)} className="py-3 px-4 min-h-[44px]">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmittingStaff} className="py-3 px-4 min-h-[44px]">
              {isSubmittingStaff ? "Registering..." : "Register Account"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL: ADD SITE TAXONOMY --- */}
      <Modal isOpen={isAddSiteOpen} onClose={() => setIsAddSiteOpen(false)} title="Add Site Sector Taxonomy">
        <form onSubmit={handleAddSiteSubmit} className="flex flex-col gap-4">
          <Input
            label="Sector Name *"
            placeholder="E.g. Nerul Mangrove Buffer..."
            value={siteName}
            onChange={(e) => setSiteName(e.target.value)}
            className="py-3"
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
            <Button type="button" variant="ghost" onClick={() => setIsAddSiteOpen(false)} className="py-3 px-4 min-h-[44px]">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmittingSite} className="py-3 px-4 min-h-[44px]">
              {isSubmittingSite ? "Adding Site..." : "Publish Sector"}
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
            label="Designate Coordinator Staff *"
            value={targetCoordId}
            onChange={(e) => setTargetCoordId(e.target.value)}
            options={staffList
              .filter(st => st && st.profile)
              .map(st => ({
                value: st.profile?.id || "",
                label: st.profile?.full_name || "Unknown User"
              }))}
          />

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={() => setIsReassignOpen(false)} className="py-3 px-4 min-h-[44px]">
              Cancel
            </Button>
            <Button type="submit" disabled={isReassignSubmitting} className="py-3 px-4 min-h-[44px]">
              {isReassignSubmitting ? "Reassigning..." : "Complete Reassignment"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* --- CONFIRM BULK DEACTIVATE MODAL --- */}
      <Modal isOpen={isDeactivateBulkConfirmOpen} onClose={() => setIsDeactivateBulkConfirmOpen(false)} title="Confirm Bulk Deactivation">
        <div className="flex flex-col gap-4 text-xs text-slate-600">
          <p className="font-semibold text-deep text-sm">Are you absolutely sure you want to deactivate {reassignVolIds.length} selected profiles?</p>
          <p>These volunteers will immediately lose credentials, mobile Depth Gauge clearance, and dashboard access. This action cannot be undone automatically.</p>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="ghost" onClick={() => setIsDeactivateBulkConfirmOpen(false)} className="py-3 px-4 min-h-[44px]">Cancel</Button>
            <Button variant="danger" onClick={handleBulkDeactivateConfirm} className="py-3 px-4 min-h-[44px]">Deactivate All Selected</Button>
          </div>
        </div>
      </Modal>

      {/* --- CONFIRM DELETE SITE TAXONOMY --- */}
      <Modal isOpen={isDeleteSiteConfirmOpen} onClose={() => setIsDeleteSiteConfirmOpen(false)} title="Confirm Site Deletion">
        <div className="flex flex-col gap-4 text-xs text-slate-600">
          <p className="font-semibold text-deep text-sm">Are you sure you want to remove this site sector taxonomy?</p>
          <p>This will erase the site registration from the active registry directory. Volunteers who selected this site as preferred may need to manually update their location settings.</p>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="ghost" onClick={() => setIsDeleteSiteConfirmOpen(false)} className="py-3 px-4 min-h-[44px]">Cancel</Button>
            <Button variant="danger" onClick={handleDeleteSiteConfirm} className="py-3 px-4 min-h-[44px]">Delete Taxonomy</Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
