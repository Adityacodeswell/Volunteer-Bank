import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Users, CheckSquare, Calendar, MessageSquare, Plus, Mail, 
  Phone, MapPin, Award, Trash2, ArrowRight, ShieldAlert, 
  Send, UserCheck, AlertTriangle, ListFilter, ClipboardCheck, 
  CheckCircle2, FolderDot, Volume2, Search, Edit2, X, PlusCircle, Waves, Menu,
  Bell, BarChart3, Info, Check
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
  VolunteerAvailability,
  JoinRequest,
  VolunteerApplication
} from "../types";
import { supabase } from "../supabaseClient";

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

export default function StaffDashboard() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<
    "overview" | "volunteers" | "tasks" | "opportunities" | "requests" | "messages" | "analytics" | "applications"
  >("overview");
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

  // Data storage
  const [volunteers, setVolunteers] = useState<VolunteerWithProfile[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunityWithSite[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [applications, setApplications] = useState<VolunteerApplication[]>([]);
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
  const [isSendInviteOpen, setIsSendInviteOpen] = useState(false);
  const [selectedOppForComplete, setSelectedOppForComplete] = useState<OpportunityWithSite | null>(null);

  // Log Hours and Certificate states (Part 5 Additions)
  const [isLogHoursOpen, setIsLogHoursOpen] = useState(false);
  const [selectedVolForHours, setSelectedVolForHours] = useState<VolunteerWithProfile | null>(null);
  const [hoursToAdd, setHoursToAdd] = useState("");
  const [hoursDesc, setHoursDesc] = useState("");
  const [hoursDate, setHoursDate] = useState(new Date().toISOString().split("T")[0]);
  const [isSubmittingLogHours, setIsSubmittingLogHours] = useState(false);
  const [isCertOpen, setIsCertOpen] = useState(false);
  const [selectedVolForCert, setSelectedVolForCert] = useState<VolunteerWithProfile | null>(null);

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
  const [isSubmittingVol, setIsSubmittingVol] = useState(false);

  // Form states - Add Task
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskAssigneeId, setTaskAssigneeId] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskPriority, setTaskPriority] = useState<"low" | "medium" | "high">("medium");
  const [taskLinkedOpp, setTaskLinkedOpp] = useState("");
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

  // Form states - Bulk Site Assign Task
  const [bulkTaskTitle, setBulkTaskTitle] = useState("");
  const [bulkTaskDesc, setBulkTaskDesc] = useState("");
  const [bulkTaskSite, setBulkTaskSite] = useState("");
  const [bulkTaskDueDate, setBulkTaskDueDate] = useState("");
  const [bulkTaskPriority, setBulkTaskPriority] = useState<"low" | "medium" | "high">("medium");
  const [isSubmittingBulkTask, setIsSubmittingBulkTask] = useState(false);

  // Form states - Add Opportunity
  const [oppTitle, setOppTitle] = useState("");
  const [oppSiteId, setOppSiteId] = useState("");
  const [oppType, setOppType] = useState("");
  const [oppDesc, setOppDesc] = useState("");
  const [oppCommitment, setOppCommitment] = useState("");
  const [oppDate, setOppDate] = useState("");
  const [oppCapacity, setOppCapacity] = useState("");
  const [isSubmittingOpp, setIsSubmittingOpp] = useState(false);

  // Form states - Complete Campaign
  const [attendeesList, setAttendeesList] = useState<string[]>([]); 
  const [hoursToLog, setHoursToLog] = useState("3");
  const [isSubmittingComplete, setIsSubmittingComplete] = useState(false);

  // Thread messaging states
  const [activeThreadVolId, setActiveThreadVolId] = useState<string | null>(null);
  const [newStaffMessage, setNewStaffMessage] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [broadcastType, setBroadcastType] = useState<"site" | "tag">("site");
  const [broadcastTarget, setBroadcastTarget] = useState("");
  const [broadcastBody, setBroadcastBody] = useState("");
  const [isSubmittingBroadcast, setIsSubmittingBroadcast] = useState(false);

  // Invite states
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteMsg, setInviteMsg] = useState("");
  const [isSubmittingInvite, setIsSubmittingInvite] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const interestsList = ["Mangrove Conservation", "Creek Cleanup", "Water Quality", "Community Outreach", "Scuba Reef Survey", "Plastic Removal", "Sapling Count", "Soil Restoration", "Field School Alum"];
  const howHeardList = ["Social media", "College presentation", "Website search", "Word of mouth", "Outreach brochure"];

  // Fetch Core Database parameters
  const loadAllData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setErrorState(null);
    try {
      // 1. Fetch volunteers assigned to this coordinator
      const { data: volsData, error: volsErr } = await supabase
        .from("volunteers")
        .select("*, profile:profiles!volunteers_profile_id_fkey(*), site:sites(name)")
        .eq("coordinator_id", user.id);

      if (volsErr) throw new Error(volsErr.message);

      const mappedVols: VolunteerWithProfile[] = (volsData || [])
        .filter(v => v && v.profile)
        .map(v => ({
          ...v,
          profile: v.profile,
          site_name: v.site?.name,
          coordinator_name: user?.full_name || "Unknown Coordinator"
        }));
      setVolunteers(mappedVols);

      // 2. Fetch opportunities
      const { data: oppsData, error: oppsErr } = await supabase
        .from("opportunities")
        .select("*, site:sites(name)")
        .order("date");

      if (oppsErr) throw new Error(oppsErr.message);

      // Fetch opportunity signups count
      const { data: allSignups, error: signupsErr } = await supabase
        .from("opportunity_signups")
        .select("opportunity_id");

      if (signupsErr) throw new Error(signupsErr.message);

      const signupCounts = (allSignups || []).reduce((acc: any, s: any) => {
        if (s && s.opportunity_id) {
          acc[s.opportunity_id] = (acc[s.opportunity_id] || 0) + 1;
        }
        return acc;
      }, {});

      const mappedOpps: OpportunityWithSite[] = (oppsData || []).map(o => ({
        ...o,
        signup_count: o?.id ? signupCounts[o.id] || 0 : 0,
        site: o.site
      }));
      setOpportunities(mappedOpps);

      // 3. Fetch tasks
      const { data: tasksData, error: tasksErr } = await supabase
        .from("tasks")
        .select("*, volunteer:profiles!tasks_assigned_to_volunteer_id_fkey(full_name)")
        .eq("assigned_by_staff_id", user.id)
        .order("due_date");

      if (tasksErr) throw new Error(tasksErr.message);

      const mappedTasks: Task[] = (tasksData || []).map(t => ({
        ...t,
        volunteer_name: t.volunteer?.full_name || "Unknown Volunteer"
      }));
      setTasks(mappedTasks);

      // 4. Fetch sites
      const { data: sitesData, error: sitesErr } = await supabase
        .from("sites")
        .select("*")
        .order("name");

      if (sitesErr) throw new Error(sitesErr.message);
      setSites(sitesData || []);

      // 5. Fetch join requests
      const { data: reqsData, error: reqsErr } = await supabase
        .from("join_requests")
        .select("*")
        .or(`from_id.eq.${user.id},to_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      let enrichedRequests: JoinRequest[] = [];
      if (!reqsErr && reqsData) {
        const senderIds = reqsData.map(r => r.from_id).filter(Boolean);
        const receiverIds = reqsData.map(r => r.to_id).filter(Boolean);
        const allProfileIds = Array.from(new Set([...senderIds, ...receiverIds]));
        
        const { data: reqProfiles } = await supabase
          .from("profiles")
          .select("*")
          .in("id", allProfileIds);

        const profileMap = (reqProfiles || []).reduce((acc: any, p: any) => {
          if (p && p.id) acc[p.id] = p;
          return acc;
        }, {});

        enrichedRequests = reqsData.map(r => ({
          ...r,
          from_profile: profileMap[r.from_id],
          to_profile: profileMap[r.to_id]
        }));
      }
      setJoinRequests(enrichedRequests);

      // 6. Fetch volunteer applications
      const { data: appsData, error: appsErr } = await supabase
        .from("volunteer_applications")
        .select("*")
        .order("created_at", { ascending: false });

      if (appsErr) throw new Error(appsErr.message);
      setApplications(appsData || []);

      // Defaults
      if (sitesData && sitesData.length > 0) {
        setVolSitePref(sitesData[0].id);
        setOppSiteId(sitesData[0].id);
        setBulkTaskSite(sitesData[0].id);
        setBroadcastTarget(sitesData[0].id);
      }
      if (mappedVols.length > 0) {
        setTaskAssigneeId(mappedVols[0].profile_id);
        if (!activeThreadVolId) {
          setActiveThreadVolId(mappedVols[0].profile_id);
        }
      }

      // Aggregate metrics
      const activeCount = mappedVols.filter(v => v.status === "active").length;
      const totalHrs = mappedVols.reduce((sum, v) => sum + (v.hours_logged || 0), 0);
      const remainingTasks = mappedTasks.filter(t => t.status !== "done").length;

      // Unread messages counts
      const { count: unreadCount, error: msgCountErr } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("recipient_id", user.id)
        .eq("read", false);

      if (msgCountErr) throw new Error(msgCountErr.message);

      setStats({
        totalVolunteers: mappedVols.length,
        activeThisWeek: activeCount,
        hoursLogged: totalHrs,
        openTasks: remainingTasks,
        unreadMessages: unreadCount || 0
      });

    } catch (err: any) {
      setErrorState(err.message || "Failed to synchronise coordinator data structures");
    } finally {
      setLoading(false);
    }
  }, [user, activeThreadVolId]);

  // Messages Thread sync
  const fetchMessages = useCallback(async () => {
    if (!user || !activeThreadVolId) return;
    try {
      const threadId = [user.id, activeThreadVolId].sort().join("::");
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("thread_id", threadId)
        .order("sent_at");

      if (error) throw new Error(error.message);
      setMessages(data || []);

      // Mark unread as read
      await supabase
        .from("messages")
        .update({ read: true })
        .eq("thread_id", threadId)
        .eq("recipient_id", user.id)
        .eq("read", false);

    } catch (err: any) {
      console.error("Staff thread sync failure", err);
    }
  }, [user, activeThreadVolId]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Real-time Messages channel
  useEffect(() => {
    if (!user || !activeThreadVolId) return;

    fetchMessages();

    const threadId = [user.id, activeThreadVolId].sort().join("::");
    const channel = supabase.channel(`staff_thread:${threadId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `thread_id=eq.${threadId}` },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, activeThreadVolId, fetchMessages]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Handle Add Volunteer
  const handleAddVolunteerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!volName.trim() || !volEmail.trim() || !volPhone.trim() || !volEmergency.trim()) {
      showToast("Please fill in all required registration fields", "error");
      return;
    }

    setIsSubmittingVol(true);
    try {
      const generateTempPassword = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
        return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('') + '!';
      };
      const tempPassword = generateTempPassword();

      // Sign up on Supabase Auth without logging out current coordinator
      const tempClient = supabase; // Standard sign up (will bypass session if we create profile later, or standard SignUp is fine)
      const { data: authData, error: authErr } = await tempClient.auth.signUp({
        email: volEmail,
        password: tempPassword,
      });

      if (authErr) throw new Error(authErr.message);
      if (!authData.user) throw new Error("Could not create authentication profile");

      // Create profile row
      const { error: profileErr } = await tempClient.from("profiles").insert({
        id: authData.user.id,
        role: "volunteer",
        full_name: volName,
        email: volEmail,
        phone: volPhone,
        must_reset_password: true
      });

      if (profileErr) throw new Error(profileErr.message);

      // Create volunteer row
      const volCode = `OSI-VOL-${String(Math.floor(1000 + Math.random() * 9000))}`;
      const { error: volErr } = await tempClient.from("volunteers").insert({
        profile_id: authData.user.id,
        coordinator_id: user!.id,
        site_preference_id: volSitePref,
        interests: volInterests,
        availability: volAvailability,
        how_heard: volHowHeard,
        status: "pending",
        hours_logged: 0,
        volunteer_code: volCode,
        emergency_contact: volEmergency
      });

      if (volErr) throw new Error(volErr.message);

      setVolName("");
      setVolEmail("");
      setVolPhone("");
      setVolInterests([]);
      setVolEmergency("");
      setIsAddVolOpen(false);

      setCreatedCredentials({
        volunteer_code: volCode,
        email: volEmail,
        password: tempPassword
      });
      setCredentialsModalOpen(true);
      showToast("Volunteer registered successfully! Security profile generated.", "success");

      loadAllData();
    } catch (err: any) {
      showToast(err.message || "Failed to register volunteer", "error");
    } finally {
      setIsSubmittingVol(false);
    }
  };

  // Approve a Volunteer Application (Part 5 Additions)
  const handleApproveApplication = async (app: VolunteerApplication) => {
    try {
      const generateTempPassword = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
        return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('') + '!';
      };
      const tempPassword = generateTempPassword();

      // Sign up on Supabase Auth
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: app.email,
        password: tempPassword,
      });

      if (authErr) throw new Error(authErr.message);
      if (!authData.user) throw new Error("Could not create authentication profile");

      // Create profile row
      const { error: profileErr } = await supabase.from("profiles").insert({
        id: authData.user.id,
        role: "volunteer",
        full_name: app.full_name,
        email: app.email,
        phone: app.phone || "",
        must_reset_password: true
      });

      if (profileErr) throw new Error(profileErr.message);

      // Match site preference ID from site list
      const matchedSite = sites.find(s => s.name === app.site_preference) || sites[0];

      // Create volunteer row
      const volCode = `OSI-VOL-${String(Math.floor(1000 + Math.random() * 9000))}`;
      const { error: volErr } = await supabase.from("volunteers").insert({
        profile_id: authData.user.id,
        coordinator_id: user!.id,
        site_preference_id: matchedSite?.id || null,
        interests: app.interests || [],
        availability: app.availability || "Weekend warrior",
        how_heard: app.how_heard || "Other",
        status: "active",
        hours_logged: 0,
        volunteer_code: volCode,
        emergency_contact: "N/A"
      });

      if (volErr) throw new Error(volErr.message);

      // Update volunteer applications row
      const { error: updateAppErr } = await supabase
        .from("volunteer_applications")
        .update({
          status: "approved",
          reviewed_by: user!.id,
          reviewed_at: new Date().toISOString()
        })
        .eq("id", app.id);

      if (updateAppErr) throw new Error(updateAppErr.message);

      // Add to activity log
      await supabase.from("activity_log").insert({
        profile_id: user!.id,
        action_type: "APPLICATION_APPROVED",
        description: `Approved volunteer application for ${app.full_name} (${volCode})`
      });

      setCreatedCredentials({
        volunteer_code: volCode,
        email: app.email,
        password: tempPassword
      });
      setCredentialsModalOpen(true);
      showToast(`Application for ${app.full_name} approved! Security profile created.`, "success");
      loadAllData();
    } catch (err: any) {
      showToast(err.message || "Application approval failed", "error");
    }
  };

  // Decline a Volunteer Application (Part 5 Additions)
  const handleDeclineApplication = async (appId: string) => {
    try {
      const { error } = await supabase
        .from("volunteer_applications")
        .update({
          status: "declined",
          reviewed_by: user!.id,
          reviewed_at: new Date().toISOString()
        })
        .eq("id", appId);

      if (error) throw new Error(error.message);

      showToast("Application declined.", "info");
      loadAllData();
    } catch (err: any) {
      showToast(err.message || "Failed to decline application", "error");
    }
  };

  // Log arbitrary hours for a selected volunteer (Part 5 Additions)
  const handleLogHoursSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVolForHours || !hoursToAdd || !hoursDesc.trim() || !hoursDate) {
      showToast("Please fill in all hours log fields", "error");
      return;
    }

    setIsSubmittingLogHours(true);
    try {
      const hoursCount = parseInt(hoursToAdd);
      if (isNaN(hoursCount) || hoursCount <= 0) {
        throw new Error("Please enter a valid positive number of hours");
      }

      // 1. Insert into hours_log table
      const { error: logErr } = await supabase.from("hours_log").insert({
        volunteer_id: selectedVolForHours.profile_id,
        logged_by_staff_id: user!.id,
        hours: hoursCount,
        hours_count: hoursCount,
        activity_date: hoursDate,
        description: hoursDesc.trim()
      });

      if (logErr) throw new Error(logErr.message);

      // 2. Increment volunteers.hours_logged
      const nextHrs = (selectedVolForHours.hours_logged || 0) + hoursCount;
      const { error: volErr } = await supabase
        .from("volunteers")
        .update({ hours_logged: nextHrs })
        .eq("profile_id", selectedVolForHours.profile_id);

      if (volErr) throw new Error(volErr.message);

      // 3. Send Notification to volunteer
      await supabase.from("notifications").insert({
        user_id: selectedVolForHours.profile_id,
        type: "request_accepted",
        title: "Volunteer Hours Logged",
        body: `Your coordinator logged ${hoursCount} conservation hours: "${hoursDesc.trim()}".`,
        read: false
      });

      // 4. Log in activity_log table (resilient name)
      try {
        await supabase.from("activity_log").insert({
          profile_id: user!.id,
          action_type: "HOURS_LOGGED",
          description: `Logged ${hoursCount} hours for ${selectedVolForHours.profile?.full_name || "Volunteer"}`
        });
      } catch (e) {
        console.warn("Could not write to activity log", e);
      }

      setIsLogHoursOpen(false);
      setSelectedVolForHours(null);
      setHoursToAdd("");
      setHoursDesc("");
      showToast(`Successfully logged ${hoursCount} hours!`, "success");
      loadAllData();
    } catch (err: any) {
      showToast(err.message || "Failed to log hours", "error");
    } finally {
      setIsSubmittingLogHours(false);
    }
  };

  // Handle Add Task Submit
  const handleAddTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || !taskDueDate) {
      showToast("Please enter a task title and due date", "error");
      return;
    }

    setIsSubmittingTask(true);
    try {
      const { error } = await supabase.from("tasks").insert({
        title: taskTitle.trim(),
        description: taskDesc.trim(),
        assigned_to_volunteer_id: taskAssigneeId,
        assigned_by_staff_id: user!.id,
        due_date: taskDueDate,
        priority: taskPriority,
        status: "todo",
        linked_opportunity_id: taskLinkedOpp || null
      });

      if (error) throw new Error(error.message);

      // Notification
      await supabase.from("notifications").insert({
        user_id: taskAssigneeId,
        type: "task_assigned",
        title: "New Task Assigned",
        body: `You have been assigned: ${taskTitle}. Due by ${taskDueDate}.`,
        read: false
      });

      setIsAddTaskOpen(false);
      setTaskTitle("");
      setTaskDesc("");
      setTaskDueDate("");
      showToast("Task assigned to volunteer successfully!", "success");
      loadAllData();
    } catch (err: any) {
      showToast(err.message || "Task assignment failed", "error");
    } finally {
      setIsSubmittingTask(false);
    }
  };

  // Bulk Task Assigner
  const handleBulkTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkTaskTitle.trim() || !bulkTaskSite || !bulkTaskDueDate) {
      showToast("Please enter a task title, site, and due date", "error");
      return;
    }

    setIsSubmittingBulkTask(true);
    try {
      const { data: targetVols, error: volsErr } = await supabase
        .from("volunteers")
        .select("profile_id")
        .eq("site_preference_id", bulkTaskSite)
        .eq("coordinator_id", user!.id);

      if (volsErr) throw new Error(volsErr.message);

      if (!targetVols || targetVols.length === 0) {
        showToast("No active volunteers found with that site preference.", "warning");
        setIsBulkTaskOpen(false);
        return;
      }

      const tasksToInsert = targetVols.map(v => ({
        title: bulkTaskTitle.trim(),
        description: bulkTaskDesc.trim(),
        assigned_to_volunteer_id: v.profile_id,
        assigned_by_staff_id: user!.id,
        due_date: bulkTaskDueDate,
        priority: bulkTaskPriority,
        status: "todo"
      }));

      const { error: insertErr } = await supabase.from("tasks").insert(tasksToInsert);
      if (insertErr) throw new Error(insertErr.message);

      // Create notifications for all target volunteers
      for (const v of targetVols) {
        await supabase.from("notifications").insert({
          user_id: v.profile_id,
          type: "task_assigned",
          title: "New Specialized Task",
          body: `Bulk assigned: ${bulkTaskTitle}. Due by ${bulkTaskDueDate}.`,
          read: false
        });
      }

      setIsBulkTaskOpen(false);
      setBulkTaskTitle("");
      setBulkTaskDesc("");
      setBulkTaskDueDate("");
      showToast(`Bulk task created! Successfully assigned to ${targetVols.length} volunteers.`, "success");
      loadAllData();
    } catch (err: any) {
      showToast(err.message || "Bulk task assignment failed", "error");
    } finally {
      setIsSubmittingBulkTask(false);
    }
  };

  // Add Opportunity (Campaign)
  const handleAddOppSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oppTitle.trim() || !oppType.trim() || !oppDesc.trim() || !oppCommitment.trim() || !oppDate || !oppCapacity) {
      showToast("All opportunity fields are required", "error");
      return;
    }

    setIsSubmittingOpp(true);
    try {
      const { error } = await supabase.from("opportunities").insert({
        title: oppTitle.trim(),
        site_id: oppSiteId,
        type: oppType.trim(),
        description: oppDesc.trim(),
        commitment_label: oppCommitment.trim(),
        date: oppDate,
        capacity: parseInt(oppCapacity),
        created_by_staff_id: user!.id,
        status: "open"
      });

      if (error) throw new Error(error.message);

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
    } finally {
      setIsSubmittingOpp(false);
    }
  };

  // Pre-load completing modal
  const handleOpenCompleteCampaign = async (opp: OpportunityWithSite) => {
    setSelectedOppForComplete(opp);
    setHoursToLog(opp.commitment_label.split(" ")[0] || "3");

    try {
      const { data, error } = await supabase
        .from("opportunity_signups")
        .select("volunteer_id")
        .eq("opportunity_id", opp.id);

      if (error) throw new Error(error.message);

      const volIds = data.map((s: any) => s.volunteer_id);
      setAttendeesList(volIds);
      setIsCompleteOppOpen(true);
    } catch (err: any) {
      showToast("Failed to fetch campaign registration logs", "error");
    }
  };

  // Finalize completion & log hours
  const handleCompleteCampaignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOppForComplete) return;

    setIsSubmittingComplete(true);
    try {
      // 1. Mark status complete
      const { error: oppErr } = await supabase
        .from("opportunities")
        .update({ status: "completed" })
        .eq("id", selectedOppForComplete.id);

      if (oppErr) throw new Error(oppErr.message);

      // 2. Mark signups attended
      const { error: signupsErr } = await supabase
        .from("opportunity_signups")
        .update({ attended: true })
        .eq("opportunity_id", selectedOppForComplete.id)
        .in("volunteer_id", attendeesList);

      if (signupsErr) throw new Error(signupsErr.message);

      // 3. Add hours to logs
      for (const volId of attendeesList) {
        const currentVol = volunteers.find(v => v.profile_id === volId);
        const nextHrs = (currentVol?.hours_logged || 0) + parseInt(hoursToLog);
        await supabase
          .from("volunteers")
          .update({ hours_logged: nextHrs })
          .eq("profile_id", volId);

        // Notify volunteer of completed campaign
        await supabase.from("notifications").insert({
          user_id: volId,
          type: "request_accepted",
          title: "Hours Logged & Approved",
          body: `Congratulations! ${hoursToLog} hours have been credited for completing "${selectedOppForComplete.title}".`,
          read: false
        });
      }

      setIsCompleteOppOpen(false);
      setSelectedOppForComplete(null);
      showToast("Campaign finalized! Attendance compiled and hours credited.", "success");
      loadAllData();
    } catch (err: any) {
      showToast(err.message || "Failed to finalize campaign metrics", "error");
    } finally {
      setIsSubmittingComplete(false);
    }
  };

  const toggleAttendee = (volId: string) => {
    setAttendeesList(prev => 
      prev.includes(volId) ? prev.filter(id => id !== volId) : [...prev, volId]
    );
  };

  // Send Direct Msg
  const handleSendStaffMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffMessage.trim() || !activeThreadVolId) return;

    setIsSendingMessage(true);
    try {
      const threadId = [user!.id, activeThreadVolId].sort().join("::");
      const { error } = await supabase.from("messages").insert({
        thread_id: threadId,
        sender_id: user!.id,
        recipient_id: activeThreadVolId,
        body: newStaffMessage.trim(),
        sent_at: new Date().toISOString(),
        read: false
      });

      if (error) throw new Error(error.message);

      // Notification
      await supabase.from("notifications").insert({
        user_id: activeThreadVolId,
        type: "new_message",
        title: "New Message from Coordinator",
        body: newStaffMessage.trim().slice(0, 80),
        read: false
      });

      setNewStaffMessage("");
      fetchMessages();
    } catch (err: any) {
      showToast(err.message || "Failed to transmit secure message", "error");
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Broadcast Message
  const handleBroadcastSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTarget || !broadcastBody.trim()) {
      showToast("Please specify a broadcast target and message body", "error");
      return;
    }

    setIsSubmittingBroadcast(true);
    try {
      let targetVols: any[] = [];
      if (broadcastType === "site") {
        const { data, error } = await supabase
          .from("volunteers")
          .select("profile_id")
          .eq("site_preference_id", broadcastTarget)
          .eq("coordinator_id", user!.id);

        if (error) throw new Error(error.message);
        targetVols = data || [];
      } else {
        const { data, error } = await supabase
          .from("volunteers")
          .select("profile_id")
          .contains("interests", [broadcastTarget])
          .eq("coordinator_id", user!.id);

        if (error) throw new Error(error.message);
        targetVols = data || [];
      }

      if (targetVols.length === 0) {
        showToast("No active volunteers found matching that broadcast selector.", "warning");
        setIsBroadcastOpen(false);
        return;
      }

      // Insert broadcast messages
      const msgsToInsert = targetVols.map(v => {
        const threadId = [user!.id, v.profile_id].sort().join("::");
        return {
          thread_id: threadId,
          sender_id: user!.id,
          recipient_id: v.profile_id,
          body: `[BROADCAST] ${broadcastBody.trim()}`,
          sent_at: new Date().toISOString(),
          read: false
        };
      });

      const { error: insertErr } = await supabase.from("messages").insert(msgsToInsert);
      if (insertErr) throw new Error(insertErr.message);

      // Insert notifications for all targets
      for (const v of targetVols) {
        await supabase.from("notifications").insert({
          user_id: v.profile_id,
          type: "new_message",
          title: "Urgent Coordinator Alert",
          body: broadcastBody,
          read: false
        });
      }

      setIsBroadcastOpen(false);
      setBroadcastBody("");
      showToast(`Broadcast dispatched! Successfully sent to ${targetVols.length} volunteers.`, "success");
      loadAllData();
    } catch (err: any) {
      showToast(err.message || "Failed to dispatch broadcast alert", "error");
    } finally {
      setIsSubmittingBroadcast(false);
    }
  };

  // Send Join Invite
  const handleSendInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      showToast("Email address is required", "error");
      return;
    }

    setIsSubmittingInvite(true);
    try {
      // Find user profile by email
      const { data: profiles, error: findErr } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", inviteEmail.trim())
        .maybeSingle();

      if (findErr) throw new Error(findErr.message);
      if (!profiles) {
        throw new Error("No user registered with this email address yet. Register them first or ask them to join.");
      }

      // Create staff_to_volunteer join request (meaning staff invites volunteer to their unit)
      const { error } = await supabase.from("join_requests").insert({
        from_id: user!.id,
        to_id: profiles.id,
        type: "staff_to_volunteer",
        status: "pending",
        message: inviteMsg || "You are invited to join my active field restoration unit at Ocean School India."
      });

      if (error) throw new Error(error.message);

      // Notify the volunteer
      await supabase.from("notifications").insert({
        user_id: profiles.id,
        type: "join_request",
        title: "Coordinator Unit Invitation",
        body: `Staff Coordinator ${user!.full_name} has invited you to join their unit.`,
        read: false
      });

      setIsSendInviteOpen(false);
      setInviteEmail("");
      setInviteMsg("");
      showToast("Restoration invitation sent successfully!", "success");
      loadAllData();
    } catch (err: any) {
      showToast(err.message || "Failed to dispatch invite request", "error");
    } finally {
      setIsSubmittingInvite(false);
    }
  };

  // Filter Volunteers list
  const filteredVolunteers = volunteers.filter(v => {
    const name = v.profile?.full_name || "Pending Name";
    const code = v.volunteer_code || "";
    return name.toLowerCase().includes(volSearch.toLowerCase()) || code.toLowerCase().includes(volSearch.toLowerCase());
  });

  const activeVolForChat = volunteers.find(v => v.profile_id === activeThreadVolId);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* Top Banner Control */}
      <header className="sticky top-0 z-40 bg-[#023E8A] text-white border-b border-white/10 px-6 h-14 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-2.5">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="md:hidden p-2 hover:bg-white/10 rounded-lg text-white"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Waves className="w-6 h-6 text-white animate-pulse shrink-0" />
          <div>
            <span className="font-serif font-black text-white text-sm tracking-tight block leading-none">OCEAN SCHOOL INDIA</span>
            <span className="text-[8px] font-semibold text-sky-200 uppercase tracking-widest block leading-none mt-0.5">Staff Coordinator Hub</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-right hidden sm:flex">
            <div>
              <span className="text-xs font-bold block leading-none">{user?.full_name || "Coordinator"}</span>
              <span className="text-[9px] font-mono text-sky-200 uppercase tracking-wider block mt-1">Regional Lead</span>
            </div>
          </div>
          <Button variant="ghost" onClick={logout} className="text-xs font-semibold py-2 px-4 h-9 text-white hover:bg-white/10 hover:text-white">
            Sign Out
          </Button>
        </div>
      </header>

      {/* Staff layout structure */}
      <div className="flex-1 flex flex-col md:flex-row relative">
        
        {/* MOBILE SIDEBAR OVERLAY */}
        <AnimatePresence>
          {isSidebarOpen && (
            <div className="fixed inset-0 z-50 md:hidden">
              <div 
                className="fixed inset-0 bg-[#1B4965]/40 backdrop-blur-xs"
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
                      <Waves className="w-6 h-6 text-[#0096C7]" />
                      <span className="font-serif font-bold text-deep text-sm">OSI Coordinator</span>
                    </div>
                    <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-slate-50 rounded-full">
                      <X className="w-5 h-5 text-slate-400" />
                    </button>
                  </div>

                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2 block font-sans">Active Tabs</span>
                  <div className="flex flex-col gap-1.5">
                    {[
                      { tab: "overview", label: "Dashboard Stats", icon: <CheckCircle2 className="w-4 h-4" /> },
                      { tab: "volunteers", label: "My Volunteers Set", icon: <Users className="w-4 h-4" /> },
                      { tab: "applications", label: "Volunteer Apps", icon: <FolderDot className="w-4 h-4" /> },
                      { tab: "tasks", label: "Task Assigner", icon: <ClipboardCheck className="w-4 h-4" /> },
                      { tab: "opportunities", label: "Drives & Campaigns", icon: <Calendar className="w-4 h-4" /> },
                      { tab: "requests", label: "Requests & Invites", icon: <Bell className="w-4 h-4" /> },
                      { tab: "messages", label: "Message Channels", icon: <MessageSquare className="w-4 h-4" /> },
                      { tab: "analytics", label: "Team Analytics", icon: <BarChart3 className="w-4 h-4" /> }
                    ].map(t => (
                      <button
                        key={t.tab}
                        onClick={() => { setActiveTab(t.tab as any); setIsSidebarOpen(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                          activeTab === t.tab ? "bg-[#023E8A] text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {t.icon}
                        <span>{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4 text-xs text-slate-400 leading-relaxed font-semibold">
                  Secure Coordinator Node
                </div>
              </motion.aside>
            </div>
          )}
        </AnimatePresence>

        {/* PERSISTENT DESKTOP LEFT SIDEBAR */}
        <aside 
          className={`hidden md:flex flex-col bg-white border-r border-slate-100 p-3 shrink-0 transition-all duration-300 h-[calc(100vh-3.5rem)] sticky top-14 ${
            isSidebarExpanded ? "w-64" : "w-16"
          }`}
          onMouseEnter={() => setIsSidebarExpanded(true)}
          onMouseLeave={() => setIsSidebarExpanded(false)}
        >
          <span className={`text-[8px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-4 block truncate ${!isSidebarExpanded && "invisible"}`}>
            Controls
          </span>
          <div className="flex flex-col gap-1.5 flex-1">
            {[
              { tab: "overview", label: "Overview", icon: <CheckCircle2 className="w-4 h-4" /> },
              { tab: "volunteers", label: "My Volunteers Set", icon: <Users className="w-4 h-4" /> },
              { tab: "applications", label: "Volunteer Apps", icon: <FolderDot className="w-4 h-4" /> },
              { tab: "tasks", label: "Task Assigner", icon: <ClipboardCheck className="w-4 h-4" /> },
              { tab: "opportunities", label: "Drives & Campaigns", icon: <Calendar className="w-4 h-4" /> },
              { tab: "requests", label: "Requests & Invites", icon: <Bell className="w-4 h-4" /> },
              { tab: "messages", label: "Message Channels", icon: <MessageSquare className="w-4 h-4" /> },
              { tab: "analytics", label: "Team Analytics", icon: <BarChart3 className="w-4 h-4" /> }
            ].map(t => (
              <button
                key={t.tab}
                onClick={() => setActiveTab(t.tab as any)}
                className={`w-full flex items-center rounded-xl p-2.5 text-sm font-medium transition-all group relative ${
                  activeTab === t.tab 
                    ? "bg-[#023E8A] text-white shadow-sm" 
                    : "text-slate-600 hover:bg-slate-50 hover:text-[#023E8A]"
                }`}
                title={!isSidebarExpanded ? t.label : undefined}
              >
                <span className={`shrink-0 flex items-center justify-center ${activeTab === t.tab ? "text-white" : "text-slate-400 group-hover:text-[#023E8A]"}`}>
                  {t.icon}
                </span>
                {isSidebarExpanded && (
                  <span className="ml-3 font-medium transition-opacity duration-300 truncate">{t.label}</span>
                )}
              </button>
            ))}
          </div>
          <div className="border-t border-slate-100 pt-4 flex justify-center">
            {isSidebarExpanded ? (
              <span className="text-[10px] font-mono text-slate-400">Coordinator Active</span>
            ) : (
              <span className="text-[10px] font-mono text-slate-400">Active</span>
            )}
          </div>
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
                
                {/* --- TAB: OVERVIEW --- */}
                {activeTab === "overview" && (
                  <div className="flex flex-col gap-8">
                    {/* Stat Strip */}
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                      <Card title="Total Assigned" subtitle="Registered units" className="text-center shadow-xs">
                        <span className="font-serif font-black text-3xl text-[#1B4965]">{stats.totalVolunteers}</span>
                      </Card>
                      <Card title="Active Status" subtitle="In baseline" className="text-center shadow-xs">
                        <span className="font-serif font-black text-3xl text-[#1B4965]">{stats.activeThisWeek}</span>
                      </Card>
                      <Card title="Conservation Hours" subtitle="Approved logs" className="text-center shadow-xs">
                        <span className="font-serif font-black text-3xl text-[#1B4965]">{stats.hoursLogged}h</span>
                      </Card>
                      <Card title="Open Tasks" subtitle="Due assignments" className="text-center shadow-xs">
                        <span className="font-serif font-black text-3xl text-[#1B4965]">{stats.openTasks}</span>
                      </Card>
                      <Card title="In-App Unread" subtitle="Direct alerts" className="text-center shadow-xs">
                        <span className="font-serif font-black text-3xl text-rose-600">{stats.unreadMessages}</span>
                      </Card>
                    </div>

                    {/* Team metrics & overview table */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      <Card title="My Active Field Team" subtitle="Review volunteer profile logs at a glance." className="lg:col-span-2 shadow-xs">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                                <th className="p-3">Volunteer</th>
                                <th className="p-3">Code</th>
                                <th className="p-3">Interests</th>
                                <th className="p-3 text-center">Hours</th>
                                <th className="p-3">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {volunteers.slice(0, 5).map(v => (
                                <tr key={v.profile_id} className="hover:bg-slate-50/50">
                                  <td className="p-3 font-bold text-slate-800">{v.profile?.full_name || "Pending Name"}</td>
                                  <td className="p-3 font-mono text-sky-700">{v.volunteer_code}</td>
                                  <td className="p-3 truncate max-w-[150px]">{v.interests?.join(", ") || "General Support"}</td>
                                  <td className="p-3 text-center font-bold">{v.hours_logged || 0}h</td>
                                  <td className="p-3"><Badge status={v.status as any} /></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {volunteers.length === 0 && (
                            <div className="p-8 text-center text-slate-400 italic">No volunteers assigned yet.</div>
                          )}
                        </div>
                      </Card>

                      <Card title="Quick Direct Actions" subtitle="Initiate new operational pipelines." className="lg:col-span-1 shadow-xs">
                        <div className="flex flex-col gap-3">
                          <Button onClick={() => setIsAddVolOpen(true)} className="w-full justify-start min-h-[44px]">
                            <Plus className="w-4 h-4" /> Register New Volunteer
                          </Button>
                          <Button onClick={() => setIsAddTaskOpen(true)} variant="secondary" className="w-full justify-start min-h-[44px]">
                            <ClipboardCheck className="w-4 h-4" /> Assign Specialized Task
                          </Button>
                          <Button onClick={() => setIsBulkTaskOpen(true)} variant="secondary" className="w-full justify-start min-h-[44px]">
                            <FolderDot className="w-4 h-4" /> Bulk Site Assign Tasks
                          </Button>
                        </div>
                      </Card>
                    </div>
                  </div>
                )}

                {/* --- TAB: MY VOLUNTEERS SET --- */}
                {activeTab === "volunteers" && (
                  <div className="flex flex-col gap-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <h2 className="font-serif font-bold text-xl text-[#023E8A]">Active Team Volunteers</h2>
                        <p className="text-xs text-slate-400 mt-0.5 font-sans">Manage detailed baseline intake parameters, contact info, and contributions.</p>
                      </div>
                      <Button onClick={() => setIsAddVolOpen(true)} className="min-h-[44px]">
                        <Plus className="w-4 h-4" /> Register Volunteer
                      </Button>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
                      <Input
                        placeholder="Search assigned volunteers by name or volunteer code..."
                        value={volSearch}
                        onChange={(e) => setVolSearch(e.target.value)}
                        className="py-2.5"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredVolunteers.map(v => {
                        const name = v.profile?.full_name || "Pending Name";
                        const email = v.profile?.email || "";
                        const phone = v.profile?.phone || "";
                        return (
                          <div key={v.profile_id} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between">
                            <div>
                              <div className="flex justify-between items-start">
                                <div className="flex gap-3">
                                  <Avatar name={name} size="md" />
                                  <div>
                                    <h3 className="font-bold text-sm text-[#023E8A] truncate">{name}</h3>
                                    <p className="text-[10px] font-mono text-[#0096C7] font-bold tracking-wider mt-0.5">{v.volunteer_code}</p>
                                  </div>
                                </div>
                                <Badge status={v.status as any} />
                              </div>

                              <div className="mt-4 border-t border-slate-50 pt-3 flex flex-col gap-1.5 text-xs text-slate-500">
                                <div className="flex items-center gap-2">
                                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                                  <span className="truncate">{email}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{phone || "No phone listed"}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                  <span className="truncate">Pref: {v.site_name || "General Support"}</span>
                                </div>
                              </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-slate-50 flex flex-col gap-2">
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-400">Logged Contribution:</span>
                                <span className="font-bold text-emerald-600">{v.hours_logged || 0}h logged</span>
                              </div>
                              <div className="flex gap-2 mt-1">
                                <Button
                                  variant="secondary"
                                  onClick={() => {
                                    setSelectedVolForHours(v);
                                    setIsLogHoursOpen(true);
                                  }}
                                  className="flex-1 py-1 px-2 text-[11px] min-h-[32px] justify-center"
                                >
                                  Log Hours
                                </Button>
                                <Button
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedVolForCert(v);
                                    setIsCertOpen(true);
                                  }}
                                  className={`flex-1 py-1 px-2 text-[11px] min-h-[32px] justify-center border ${
                                    v.hours_logged >= 10 
                                      ? "bg-[#0096C7]/10 hover:bg-[#0096C7]/20 text-[#023E8A] border-[#0096C7]/30" 
                                      : "bg-slate-50 hover:bg-slate-100 text-slate-400 border-slate-200"
                                  }`}
                                >
                                  Certificate
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {filteredVolunteers.length === 0 && (
                        <div className="col-span-full p-12 text-center text-slate-400 italic">No matching volunteer records.</div>
                      )}
                    </div>
                  </div>
                )}

                {/* --- TAB: TASKS --- */}
                {activeTab === "tasks" && (
                  <div className="flex flex-col gap-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <h2 className="font-serif font-bold text-xl text-[#023E8A]">Active Task Assignments</h2>
                        <p className="text-xs text-slate-400 mt-0.5">Publish custom single checklists or bulk site calibrated assignments.</p>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => setIsAddTaskOpen(true)} className="min-h-[44px]">
                          <Plus className="w-4 h-4" /> Single Task
                        </Button>
                        <Button onClick={() => setIsBulkTaskOpen(true)} variant="secondary" className="min-h-[44px]">
                          <FolderDot className="w-4 h-4" /> Bulk Site Assignment
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {["todo", "in_progress", "done"].map(col => {
                        const colTasks = tasks.filter(t => t.status === col);
                        return (
                          <div key={col} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col gap-4">
                            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                {{ todo: "To Do", in_progress: "In Progress", done: "Done" }[col]}
                              </span>
                              <span className="bg-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{colTasks.length}</span>
                            </div>

                            <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1">
                              {colTasks.map(t => (
                                <div key={t.id} className="bg-white border border-slate-100 rounded-xl p-4 shadow-xs flex flex-col gap-2.5">
                                  <div className="flex justify-between items-start gap-2">
                                    <h4 className="font-serif font-bold text-sm text-[#1B4965]">{t.title}</h4>
                                    <Badge status={t.priority} />
                                  </div>
                                  <p className="text-slate-500 text-[11px] leading-relaxed line-clamp-2">{t.description}</p>
                                  <div className="flex justify-between items-center text-[10px] border-t border-slate-50 pt-2.5">
                                    <span className="text-slate-400 font-mono">Due: {t.due_date}</span>
                                    <span className="font-semibold text-slate-700 truncate max-w-[120px]">{t.volunteer_name}</span>
                                  </div>
                                </div>
                              ))}
                              {colTasks.length === 0 && (
                                <div className="p-8 text-center text-slate-400 italic text-[11px]">No active assignments in this stage.</div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* --- TAB: OPPORTUNITIES --- */}
                {activeTab === "opportunities" && (
                  <div className="flex flex-col gap-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <h2 className="font-serif font-bold text-xl text-[#023E8A]">Coastal restoration drives & Campaigns</h2>
                        <p className="text-xs text-slate-400 mt-0.5">Publish new baseline campaigns, finalize metrics, and credit volunteer hours.</p>
                      </div>
                      <Button onClick={() => setIsAddOppOpen(true)} className="min-h-[44px]">
                        <Plus className="w-4 h-4" /> Create Campaign Drive
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {opportunities.map(opp => (
                        <div key={opp.id} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-start">
                              <span className="text-[10px] font-bold text-cyan uppercase tracking-wider">{opp.type}</span>
                              <Badge status={opp.status} />
                            </div>
                            <h3 className="font-serif font-bold text-base text-[#1B4965] mt-2 leading-snug">{opp.title}</h3>
                            <p className="text-slate-500 text-xs mt-2 leading-relaxed line-clamp-3">{opp.description}</p>
                          </div>

                          <div className="mt-5 border-t border-slate-50 pt-4 flex flex-col gap-2">
                            <div className="flex items-center gap-2 text-xs text-slate-600">
                              <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                              <span className="truncate">{opp.site?.name || "Multiple Sites"}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-600">
                              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                              <span>{opp.date}</span>
                            </div>
                            <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-50 text-xs">
                              <span className="text-slate-400">Registrations Count:</span>
                              <span className="font-bold text-[#0096C7]">{opp.signup_count} / {opp.capacity}</span>
                            </div>
                          </div>

                          {opp.status === "open" && (
                            <div className="mt-4 pt-3 border-t border-slate-50 flex justify-end">
                              <Button onClick={() => handleOpenCompleteCampaign(opp)} className="text-xs py-2 px-3.5 min-h-[38px]">
                                Finalize & Credit Hours
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* --- TAB: REQUESTS & INVITES --- */}
                {activeTab === "requests" && (
                  <div className="flex flex-col gap-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <h2 className="font-serif font-bold text-xl text-[#023E8A]">Requests & Invites Hub</h2>
                        <p className="text-xs text-slate-400 mt-0.5">Invite new restoration participants or track pending join applications.</p>
                      </div>
                      <Button onClick={() => setIsSendInviteOpen(true)} className="min-h-[44px]">
                        <Send className="w-4 h-4" /> Send Join Invite
                      </Button>
                    </div>

                    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                      <div className="p-4 bg-slate-50 border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Dispatched Invites & Applications Logs
                      </div>
                      <div className="divide-y divide-slate-100">
                        {joinRequests.map(req => {
                          const isIncoming = req.to_id === user!.id;
                          const oppositeName = isIncoming 
                            ? (req.from_profile?.full_name || "Applicant") 
                            : (req.to_profile?.full_name || "Recipient");
                          const oppositeEmail = isIncoming ? req.from_profile?.email : req.to_profile?.email;

                          return (
                            <div key={req.id} className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                              <div className="flex gap-3">
                                <Avatar name={oppositeName} size="md" />
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-sm text-[#1B4965]">{oppositeName}</h3>
                                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                                      isIncoming ? "bg-cyan/10 text-cyan border border-cyan/20" : "bg-slate-100 text-slate-600 border border-slate-200"
                                    }`}>
                                      {isIncoming ? "Incoming" : "Invite Dispatched"}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-slate-400 mt-0.5">{oppositeEmail}</p>
                                  <p className="text-xs text-slate-500 mt-2 font-mono bg-slate-50 p-2 rounded-lg border border-slate-100">
                                    {req.message}
                                  </p>
                                </div>
                              </div>

                              <div className="flex flex-col sm:items-end gap-2 shrink-0">
                                <Badge status={req.status as any} />
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {new Date(req.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                        {joinRequests.length === 0 && (
                          <div className="p-12 text-center text-slate-400 italic text-xs">No active promotion requests or invites log.</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* --- TAB: APPLICATIONS (Part 5 Additions) --- */}
                {activeTab === "applications" && (
                  <div className="flex flex-col gap-6">
                    <div>
                      <h2 className="font-serif font-bold text-xl text-[#023E8A]">Volunteer Applications</h2>
                      <p className="text-xs text-slate-400 mt-0.5">Review and approve enrollment requests from prospective coastal restoration volunteers.</p>
                    </div>

                    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                      <div className="p-4 bg-slate-50 border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Prospective Volunteer Applications
                      </div>
                      <div className="divide-y divide-slate-100">
                        {applications.map(app => (
                          <div key={app.id} className="p-5 flex flex-col gap-4">
                            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                              <div className="flex gap-3">
                                <Avatar name={app.full_name} size="md" />
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="font-bold text-sm text-[#1B4965]">{app.full_name}</h3>
                                    <span className="text-[10px] text-slate-400 font-mono">({app.email})</span>
                                    <Badge status={app.status as any} />
                                  </div>
                                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500 mt-1 font-mono">
                                    {app.phone && <div>PHONE: <span className="font-semibold text-slate-700">{app.phone}</span></div>}
                                    <div>PREF SITE: <span className="font-semibold text-slate-700">{app.site_preference || "Any"}</span></div>
                                    <div>AVAILABILITY: <span className="font-semibold text-slate-700">{app.availability || "N/A"}</span></div>
                                  </div>
                                </div>
                              </div>

                              <div className="text-right text-[10px] text-slate-400 font-mono shrink-0">
                                Received: {new Date(app.created_at).toLocaleDateString()}
                              </div>
                            </div>

                            {/* Application Details */}
                            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-2">
                              {app.message && (
                                <p className="leading-relaxed">
                                  <span className="font-semibold text-slate-700 block mb-1">Cover Message:</span>
                                  "{app.message}"
                                </p>
                              )}
                              {app.interests && app.interests.length > 0 && (
                                <div className="flex flex-wrap gap-1 items-center mt-1">
                                  <span className="font-semibold text-slate-700 mr-1">Interests:</span>
                                  {app.interests.map(interest => (
                                    <Chip key={interest} label={interest} color="blue" size="sm" />
                                  ))}
                                </div>
                              )}
                              {app.how_heard && (
                                <p className="text-[11px] text-slate-400 italic">
                                  How heard: {app.how_heard}
                                </p>
                              )}
                            </div>

                            {/* Action Buttons */}
                            {app.status === "pending" && (
                              <div className="flex justify-end gap-2 mt-1">
                                <Button
                                  variant="ghost"
                                  onClick={() => handleDeclineApplication(app.id)}
                                  className="text-xs py-2 px-4 hover:bg-rose-50 hover:text-rose-600 hover:bg-opacity-80"
                                >
                                  Decline
                                </Button>
                                <Button
                                  onClick={() => handleApproveApplication(app)}
                                  className="text-xs py-2 px-4 bg-[#0096C7] hover:bg-[#023E8A]"
                                >
                                  Approve & Enroll
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}

                        {applications.length === 0 && (
                          <div className="p-12 text-center text-slate-400 italic text-xs">No volunteer applications found.</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* --- TAB: MESSAGES --- */}
                {activeTab === "messages" && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-12rem)] min-h-[500px]">
                    
                    {/* Chat Sidebar: Volunteers List */}
                    <div className="lg:col-span-1 bg-white border border-slate-100 rounded-2xl flex flex-col overflow-hidden shadow-xs">
                      <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center shrink-0">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">My Team Channels</span>
                        <Button onClick={() => setIsBroadcastOpen(true)} className="text-xs py-1.5 px-3 min-h-[34px]">
                          <Volume2 className="w-3.5 h-3.5" /> Broadcast
                        </Button>
                      </div>

                      <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
                        {volunteers.map(v => {
                          const name = v.profile?.full_name || "Pending Name";
                          return (
                            <div
                              key={v.profile_id}
                              onClick={() => setActiveThreadVolId(v.profile_id)}
                              className={`p-4 flex gap-3 cursor-pointer transition ${
                                activeThreadVolId === v.profile_id ? "bg-[#023E8A]/5 font-semibold" : "hover:bg-slate-50/50"
                              }`}
                            >
                              <Avatar name={name} size="sm" />
                              <div className="min-w-0 flex-1">
                                <p className="text-xs text-slate-800 font-bold truncate">{name}</p>
                                <p className="text-[10px] text-slate-400 truncate mt-0.5">{v.volunteer_code}</p>
                              </div>
                            </div>
                          );
                        })}
                        {volunteers.length === 0 && (
                          <div className="p-8 text-center text-slate-400 italic text-xs">No assigned team channels.</div>
                        )}
                      </div>
                    </div>

                    {/* Chat Panel */}
                    <div className="lg:col-span-2 bg-white border border-slate-100 rounded-2xl flex flex-col overflow-hidden shadow-xs">
                      {activeVolForChat ? (
                        <>
                          <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-3 shrink-0">
                            <Avatar name={activeVolForChat.profile?.full_name || "Volunteer"} size="sm" />
                            <div>
                              <p className="text-xs font-bold text-[#1B4965]">{activeVolForChat.profile?.full_name || "Pending Name"}</p>
                              <p className="text-[10px] text-slate-400 font-mono">{activeVolForChat.volunteer_code}</p>
                            </div>
                          </div>

                          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-slate-50/50">
                            {messages.map(msg => {
                              const isMe = msg.sender_id === user!.id;
                              return (
                                <div key={msg.id} className={`flex flex-col max-w-[75%] ${isMe ? "self-end items-end" : "self-start items-start"}`}>
                                  <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                                    isMe ? "bg-[#023E8A] text-white rounded-tr-xs" : "bg-white border border-slate-100 text-slate-800 rounded-tl-xs shadow-xs"
                                  }`}>
                                    {msg.body}
                                  </div>
                                  <span className="text-[9px] text-slate-400 font-mono mt-1">
                                    {new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              );
                            })}
                            <div ref={messagesEndRef} />
                            {messages.length === 0 && (
                              <div className="m-auto text-center text-slate-400 italic text-xs">No messages yet. Begin active thread!</div>
                            )}
                          </div>

                          <form onSubmit={handleSendStaffMessage} className="p-4 bg-white border-t border-slate-100 flex gap-2 shrink-0">
                            <Input
                              placeholder="Type coordinator directive..."
                              value={newStaffMessage}
                              onChange={(e) => setNewStaffMessage(e.target.value)}
                              className="py-2.5"
                            />
                            <Button type="submit" disabled={isSendingMessage} className="px-5 min-h-[44px]">
                              <Send className="w-4 h-4" /> Send
                            </Button>
                          </form>
                        </>
                      ) : (
                        <div className="m-auto text-center p-8">
                          <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                          <p className="text-xs text-slate-400 italic">Select an assigned volunteer from the list to initiate conversation thread.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* --- TAB: TEAM ANALYTICS --- */}
                {activeTab === "analytics" && (
                  <div className="flex flex-col gap-6">
                    <div>
                      <h2 className="font-serif font-bold text-xl text-[#023E8A]">Team Analytics</h2>
                      <p className="text-xs text-slate-400 mt-0.5 font-sans">Review cumulative baseline participation load, plastic removal metrics, and team contribution curves.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card title="Restoration Impact Metrics" subtitle="Environmental calibration metrics" className="shadow-xs">
                        <div className="flex flex-col gap-4 text-xs">
                          <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="font-semibold text-slate-600">Saplings Sown Count:</span>
                            <span className="font-mono font-bold text-[#0096C7] text-sm">{stats.hoursLogged * 5} saplings</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="font-semibold text-slate-600">Estuary Plastic Extracted:</span>
                            <span className="font-mono font-bold text-[#0096C7] text-sm">{stats.hoursLogged * 12} kg</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="font-semibold text-slate-600">Households Reached:</span>
                            <span className="font-mono font-bold text-[#0096C7] text-sm">{Math.floor(stats.hoursLogged * 1.5)} units</span>
                          </div>
                        </div>
                      </Card>

                      <Card title="Individual Team Hours breakdown" subtitle="Assigned active contributors" className="shadow-xs">
                        <div className="flex flex-col gap-4 py-2">
                          {volunteers.map(v => {
                            const maxHrs = Math.max(...volunteers.map(vol => vol.hours_logged), 1);
                            const percent = Math.min(Math.round(((v.hours_logged || 0) / maxHrs) * 100), 100);
                            return (
                              <div key={v.profile_id} className="flex items-center gap-4 text-xs">
                                <span className="w-24 truncate font-bold text-slate-700">{v.profile?.full_name || "Pending Name"}</span>
                                <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden flex items-center">
                                  <div 
                                    className="h-full bg-[#0096C7] rounded-full transition-all duration-500" 
                                    style={{ width: `${percent}%` }}
                                  />
                                </div>
                                <span className="font-bold text-slate-600">{v.hours_logged || 0}h</span>
                              </div>
                            );
                          })}
                          {volunteers.length === 0 && (
                            <div className="text-center text-slate-400 italic">No assigned team data.</div>
                          )}
                        </div>
                      </Card>
                    </div>
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          )}
        </main>
      </div>

      {/* --- MODAL: REGISTER VOLUNTEER --- */}
      <Modal isOpen={isAddVolOpen} onClose={() => setIsAddVolOpen(false)} title="Register New Field Volunteer">
        <form onSubmit={handleAddVolunteerSubmit} className="flex flex-col gap-4 text-xs">
          <Input
            label="Full Name *"
            placeholder="E.g. Meera Sen..."
            value={volName}
            onChange={(e) => setVolName(e.target.value)}
            className="py-3"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Email Address *"
              placeholder="E.g. meera@ocean.edu..."
              type="email"
              value={volEmail}
              onChange={(e) => setVolEmail(e.target.value)}
              className="py-3"
              required
            />

            <Input
              label="Phone Contact *"
              placeholder="E.g. +91 98765 43211..."
              value={volPhone}
              onChange={(e) => setVolPhone(e.target.value)}
              className="py-3"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Preferred Sector Site *"
              value={volSitePref}
              onChange={(e) => setVolSitePref(e.target.value)}
              options={sites.map(s => ({ value: s.id, label: s.name }))}
            />

            <Select
              label="Availability Schedule *"
              value={volAvailability}
              onChange={(e) => setVolAvailability(e.target.value as any)}
              options={[
                { value: "Weekend warrior", label: "Weekend warrior" },
                { value: "Several times a month", label: "Several times a month" },
                { value: "Three weeks or longer", label: "Three weeks or longer" },
                { value: "A day or two a year", label: "A day or two a year" }
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="How did they hear about us?"
              value={volHowHeard}
              onChange={(e) => setVolHowHeard(e.target.value)}
              options={howHeardList.map(h => ({ value: h, label: h }))}
            />

            <Input
              label="Emergency Contact Name/Phone *"
              placeholder="E.g. Father: +91 98222 11111..."
              value={volEmergency}
              onChange={(e) => setVolEmergency(e.target.value)}
              className="py-3"
              required
            />
          </div>

          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-deep/70 block mb-2">Interests / Focus Tags</span>
            <div className="flex flex-wrap gap-2">
              {interestsList.map(tag => {
                const isSelected = volInterests.includes(tag);
                return (
                  <Chip
                    key={tag}
                    label={tag}
                    isSelected={isSelected}
                    onClick={() => {
                      setVolInterests(prev => 
                        prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                      );
                    }}
                  />
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={() => setIsAddVolOpen(false)} className="py-3 px-4 min-h-[44px]">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmittingVol} className="py-3 px-4 min-h-[44px]">
              {isSubmittingVol ? "Registering..." : "Generate Security Profile"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* --- CREDENTIALS CONFIRMATION MODAL --- */}
      {createdCredentials && (
        <Modal isOpen={credentialsModalOpen} onClose={() => setCredentialsModalOpen(false)} title="Security Profile Generated">
          <div className="flex flex-col gap-4 text-xs">
            <div className="p-3 bg-emerald-50 rounded-lg text-emerald-800 border border-emerald-200">
              Account created successfully! Please record the generated volunteer credentials.
            </div>
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex flex-col gap-3 font-mono">
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-400">Volunteer Code:</span>
                <span className="font-bold text-[#0096C7] select-all">{createdCredentials.volunteer_code}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-400">Temporary Email:</span>
                <span className="font-bold select-all">{createdCredentials.email}</span>
              </div>
              <div className="flex justify-between pb-1">
                <span className="text-slate-400">Password:</span>
                <span className="font-bold text-coral select-all">{createdCredentials.password}</span>
              </div>
            </div>
            <div className="flex justify-end pt-4 border-t">
              <Button onClick={() => setCredentialsModalOpen(false)} className="py-3 px-4 min-h-[44px]">Got it, Close Modal</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* --- MODAL: ASSIGN TASK --- */}
      <Modal isOpen={isAddTaskOpen} onClose={() => setIsAddTaskOpen(false)} title="Assign New Specialized Task">
        <form onSubmit={handleAddTaskSubmit} className="flex flex-col gap-4 text-xs">
          <Input
            label="Task Title *"
            placeholder="E.g. Calibrate water level parameters..."
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            className="py-3"
            required
          />

          <Select
            label="Assign to Team Member *"
            value={taskAssigneeId}
            onChange={(e) => setTaskAssigneeId(e.target.value)}
            options={volunteers.map(v => ({ value: v.profile_id, label: `${v.profile?.full_name} (${v.volunteer_code})` }))}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Due Date *"
              type="date"
              value={taskDueDate}
              onChange={(e) => setTaskDueDate(e.target.value)}
              className="py-3"
              required
            />

            <Select
              label="Priority Level *"
              value={taskPriority}
              onChange={(e) => setTaskPriority(e.target.value as any)}
              options={[
                { value: "low", label: "Low Priority" },
                { value: "medium", label: "Medium Priority" },
                { value: "high", label: "Urgent Priority" }
              ]}
            />

            <Select
              label="Linked Campaign Drive"
              value={taskLinkedOpp}
              onChange={(e) => setTaskLinkedOpp(e.target.value)}
              options={[
                { value: "", label: "No linked drive" },
                ...opportunities.map(o => ({ value: o.id, label: o.title }))
              ]}
            />
          </div>

          <Textarea
            label="Task Guidelines / Description"
            placeholder="Provide task execution guidelines..."
            value={taskDesc}
            onChange={(e) => setTaskDesc(e.target.value)}
            rows={3}
          />

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={() => setIsAddTaskOpen(false)} className="py-3 px-4 min-h-[44px]">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmittingTask} className="py-3 px-4 min-h-[44px]">
              {isSubmittingTask ? "Assigning..." : "Assign Task"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL: BULK SITE ASSIGN TASK --- */}
      <Modal isOpen={isBulkTaskOpen} onClose={() => setIsBulkTaskOpen(false)} title="Bulk Site Assign Tasks">
        <form onSubmit={handleBulkTaskSubmit} className="flex flex-col gap-4 text-xs">
          <Input
            label="Task Title *"
            placeholder="E.g. Carry out baseline water quality..."
            value={bulkTaskTitle}
            onChange={(e) => setBulkTaskTitle(e.target.value)}
            className="py-3"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label="Target Preferred Site *"
              value={bulkTaskSite}
              onChange={(e) => setBulkTaskSite(e.target.value)}
              options={sites.map(s => ({ value: s.id, label: s.name }))}
            />

            <Input
              label="Due Date *"
              type="date"
              value={bulkTaskDueDate}
              onChange={(e) => setBulkTaskDueDate(e.target.value)}
              className="py-3"
              required
            />

            <Select
              label="Priority Level"
              value={bulkTaskPriority}
              onChange={(e) => setBulkTaskPriority(e.target.value as any)}
              options={[
                { value: "low", label: "Low Priority" },
                { value: "medium", label: "Medium Priority" },
                { value: "high", label: "Urgent Priority" }
              ]}
            />
          </div>

          <Textarea
            label="Task Description"
            placeholder="Provide task execution guidelines..."
            value={bulkTaskDesc}
            onChange={(e) => setBulkTaskDesc(e.target.value)}
            rows={3}
          />

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={() => setIsBulkTaskOpen(false)} className="py-3 px-4 min-h-[44px]">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmittingBulkTask} className="py-3 px-4 min-h-[44px]">
              {isSubmittingBulkTask ? "Assigning Bulk..." : "Confirm Bulk Assignment"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL: CREATE CAMPAIGN/OPPORTUNITY --- */}
      <Modal isOpen={isAddOppOpen} onClose={() => setIsAddOppOpen(false)} title="Create New Restoration Campaign">
        <form onSubmit={handleAddOppSubmit} className="flex flex-col gap-4 text-xs">
          <Input
            label="Campaign/Opportunity Title *"
            placeholder="E.g. Nerul Mangrove Buffer Seedling..."
            value={oppTitle}
            onChange={(e) => setOppTitle(e.target.value)}
            className="py-3"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Location Site *"
              value={oppSiteId}
              onChange={(e) => setOppSiteId(e.target.value)}
              options={sites.map(s => ({ value: s.id, label: s.name }))}
            />

            <Input
              label="Campaign Type (Activity) *"
              placeholder="E.g. Clean-up, Planting, Dive Survey..."
              value={oppType}
              onChange={(e) => setOppType(e.target.value)}
              className="py-3"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Commitment Label *"
              placeholder="E.g. 3 hours, 1 day..."
              value={oppCommitment}
              onChange={(e) => setOppCommitment(e.target.value)}
              className="py-3"
              required
            />

            <Input
              label="Scheduled Date *"
              type="date"
              value={oppDate}
              onChange={(e) => setOppDate(e.target.value)}
              className="py-3"
              required
            />

            <Input
              label="Attendance Capacity *"
              type="number"
              placeholder="E.g. 50..."
              value={oppCapacity}
              onChange={(e) => setOppCapacity(e.target.value)}
              className="py-3"
              required
            />
          </div>

          <Textarea
            label="Detailed Description *"
            placeholder="Type comprehensive campaign description details..."
            value={oppDesc}
            onChange={(e) => setOppDesc(e.target.value)}
            rows={4}
            required
          />

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={() => setIsAddOppOpen(false)} className="py-3 px-4 min-h-[44px]">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmittingOpp} className="py-3 px-4 min-h-[44px]">
              {isSubmittingOpp ? "Publishing..." : "Publish Campaign"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL: FINALIZE CAMPAIGN & CREDIT HOURS --- */}
      {selectedOppForComplete && (
        <Modal isOpen={isCompleteOppOpen} onClose={() => setIsCompleteOppOpen(false)} title="Credit Campaign Hours">
          <form onSubmit={handleCompleteCampaignSubmit} className="flex flex-col gap-4 text-xs">
            <div className="p-3 bg-[#0096C7]/10 text-[#023E8A] rounded-xl border border-[#0096C7]/20">
              Confirm hours credit for completing campaign: <span className="font-bold">"{selectedOppForComplete.title}"</span>
            </div>

            <Input
              label="Conservation Hours to Credit *"
              placeholder="Hours (e.g. 3)"
              type="number"
              value={hoursToLog}
              onChange={(e) => setHoursToLog(e.target.value)}
              className="py-3"
              required
            />

            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-deep/70 block mb-2">Check Attended Volunteers</span>
              <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto border border-slate-100 rounded-xl p-3 bg-slate-50">
                {volunteers.map(v => {
                  const isChecked = attendeesList.includes(v.profile_id);
                  const name = v.profile?.full_name || "Pending Name";
                  return (
                    <label key={v.profile_id} className="flex items-center gap-2.5 p-1 hover:bg-slate-100 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleAttendee(v.profile_id)}
                        className="rounded text-[#023E8A]"
                      />
                      <span>{name} ({v.volunteer_code})</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
              <Button type="button" variant="ghost" onClick={() => setIsCompleteOppOpen(false)} className="py-3 px-4 min-h-[44px]">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingComplete} className="py-3 px-4 min-h-[44px]">
                {isSubmittingComplete ? "Crediting Hours..." : "Complete & Credit Hours"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* --- MODAL: SEND JOIN INVITE --- */}
      <Modal isOpen={isSendInviteOpen} onClose={() => setIsSendInviteOpen(false)} title="Send Participant Invitation">
        <form onSubmit={handleSendInviteSubmit} className="flex flex-col gap-4 text-xs">
          <Input
            label="User Email Address *"
            placeholder="E.g. volunteer@gmail.com..."
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            className="py-3"
            required
          />

          <Textarea
            label="Invitation Message"
            placeholder="Type custom invitation details..."
            value={inviteMsg}
            onChange={(e) => setInviteMsg(e.target.value)}
            rows={3}
          />

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={() => setIsSendInviteOpen(false)} className="py-3 px-4 min-h-[44px]">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmittingInvite} className="py-3 px-4 min-h-[44px]">
              {isSubmittingInvite ? "Dispatching..." : "Dispatch Invite"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL: MESSAGE BROADCAST DIALOG --- */}
      <Modal isOpen={isBroadcastOpen} onClose={() => setIsBroadcastOpen(false)} title="Broadcast Direct Alerts">
        <form onSubmit={handleBroadcastSubmit} className="flex flex-col gap-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Broadcast Selector Category"
              value={broadcastType}
              onChange={(e) => {
                setBroadcastType(e.target.value as any);
                setBroadcastTarget(e.target.value === "site" ? (sites[0]?.id || "") : interestsList[0]);
              }}
              options={[
                { value: "site", label: "Preferred Sector Site" },
                { value: "tag", label: "Interest Tag / Focus" }
              ]}
            />

            {broadcastType === "site" ? (
              <Select
                label="Target Preferred Site *"
                value={broadcastTarget}
                onChange={(e) => setBroadcastTarget(e.target.value)}
                options={sites.map(s => ({ value: s.id, label: s.name }))}
              />
            ) : (
              <Select
                label="Target Interest Tag *"
                value={broadcastTarget}
                onChange={(e) => setBroadcastTarget(e.target.value)}
                options={interestsList.map(tag => ({ value: tag, label: tag }))}
              />
            )}
          </div>

          <Textarea
            label="Broadcast Message Alert Body *"
            placeholder="Type comprehensive broadcast directive body..."
            value={broadcastBody}
            onChange={(e) => setBroadcastBody(e.target.value)}
            rows={4}
            required
          />

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={() => setIsBroadcastOpen(false)} className="py-3 px-4 min-h-[44px]">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmittingBroadcast} className="py-3 px-4 min-h-[44px]">
              {isSubmittingBroadcast ? "Dispatching Broadcast..." : "Confirm Broadcast Alert"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL: LOG VOLUNTEER HOURS (Part 5 Additions) --- */}
      <Modal 
        isOpen={isLogHoursOpen} 
        onClose={() => {
          setIsLogHoursOpen(false);
          setSelectedVolForHours(null);
        }} 
        title={`Log Hours: ${selectedVolForHours?.profile?.full_name || "Volunteer"}`}
      >
        <form onSubmit={handleLogHoursSubmit} className="flex flex-col gap-4 text-xs">
          <p className="text-slate-400">Record a custom conservation hours entry for this volunteer's accredited field service.</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Hours Count *"
              placeholder="E.g. 8..."
              type="number"
              value={hoursToAdd}
              onChange={(e) => setHoursToAdd(e.target.value)}
              className="py-3"
              required
            />
            <Input
              label="Activity Date *"
              type="date"
              value={hoursDate}
              onChange={(e) => setHoursDate(e.target.value)}
              className="py-3"
              required
            />
          </div>

          <Textarea
            label="Restoration Activity Description *"
            placeholder="E.g. Mangrove planting and water salinity analysis at Sector Alpha..."
            value={hoursDesc}
            onChange={(e) => setHoursDesc(e.target.value)}
            rows={3}
            required
          />

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => {
                setIsLogHoursOpen(false);
                setSelectedVolForHours(null);
              }} 
              className="py-3 px-4 min-h-[44px]"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmittingLogHours} className="py-3 px-4 min-h-[44px]">
              {isSubmittingLogHours ? "Saving Log Entry..." : "Confirm & Save Entry"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL: GENERATE CERTIFICATE (Part 5 Additions) --- */}
      <Modal 
        isOpen={isCertOpen} 
        onClose={() => {
          setIsCertOpen(false);
          setSelectedVolForCert(null);
        }} 
        title="Accredited Conservation Certificate"
      >
        <div className="flex flex-col gap-5 text-xs">
          {selectedVolForCert && selectedVolForCert.hours_logged < 10 ? (
            <div className="text-center p-6 space-y-3">
              <div className="mx-auto w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 text-lg font-bold">!</div>
              <h3 className="font-bold text-sm text-slate-800">Minimum Hours Requirement Not Met</h3>
              <p className="text-slate-400">
                Volunteer needs at least <strong>10 hours</strong> of approved conservation field service to qualify for an official certificate. 
                Currently has <strong>{selectedVolForCert.hours_logged || 0} hours</strong>.
              </p>
              <div className="flex justify-center mt-4">
                <Button onClick={() => setIsCertOpen(false)} className="py-2.5 px-5">Close Panel</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* STUNNING CERTIFICATE CONTAINER */}
              <div className="bg-slate-50 border-4 border-double border-[#0096C7] p-8 rounded-2xl relative overflow-hidden shadow-md text-center font-serif text-[#1B4965] bg-opacity-70 backdrop-blur-sm">
                
                {/* Visual Seal Accent */}
                <div className="absolute top-4 right-4 w-12 h-12 rounded-full border-2 border-dashed border-[#0096C7]/30 flex items-center justify-center text-[8px] font-sans text-[#0096C7]/50 uppercase tracking-widest font-semibold select-none rotate-12">
                  OSI Seal
                </div>

                <div className="space-y-1.5 mb-6">
                  <span className="font-sans font-black tracking-widest text-[9px] text-[#0096C7] uppercase">Ocean School India</span>
                  <h1 className="text-lg font-black text-[#023E8A] uppercase tracking-wide">Certificate of Excellence</h1>
                  <span className="text-[10px] italic text-slate-500 block font-sans">Accredited Marine Conservation Program</span>
                </div>

                <p className="text-[11px] font-sans text-slate-500 mb-4">This official credential is proudly awarded to</p>
                
                <h2 className="text-xl font-bold font-serif text-[#03045E] underline decoration-[#0096C7] decoration-2 underline-offset-4 mb-4">
                  {selectedVolForCert?.profile?.full_name || "Volunteer Participant"}
                </h2>

                <p className="text-xs leading-relaxed font-sans text-slate-600 max-w-md mx-auto mb-6">
                  for successfully completing <strong>{selectedVolForCert?.hours_logged || 10} hours</strong> of accredited marine estuary restoration, shoreline baseline maintenance, and local marine community mobilization services in India.
                </p>

                <div className="grid grid-cols-2 gap-4 text-center text-[10px] font-sans border-t border-slate-100 pt-5 mt-6">
                  <div>
                    <span className="font-semibold block text-slate-700 underline underline-offset-2">
                      {user?.full_name || "Regional Coordinator"}
                    </span>
                    <span className="text-slate-400 text-[9px] uppercase tracking-wider block mt-1">Authorized Coordinator</span>
                  </div>
                  <div>
                    <span className="font-mono block text-slate-700">
                      {selectedVolForCert?.volunteer_code || "OSI-VOL-XXXX"}
                    </span>
                    <span className="text-slate-400 text-[9px] uppercase tracking-wider block mt-1">Credential Code</span>
                  </div>
                </div>

              </div>

              <div className="flex justify-end gap-3 mt-4">
                <Button variant="ghost" onClick={() => setIsCertOpen(false)} className="py-2.5 px-4">
                  Close
                </Button>
                <Button 
                  onClick={() => {
                    window.print();
                  }}
                  className="py-2.5 px-4 bg-[#023E8A] hover:bg-[#03045E]"
                >
                  Print Certificate
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

    </div>
  );
}
