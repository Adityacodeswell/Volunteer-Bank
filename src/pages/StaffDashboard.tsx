import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Users, CheckSquare, Calendar, MessageSquare, Plus, Mail, 
  Phone, MapPin, Award, Trash2, ArrowRight, ShieldAlert, 
  Send, UserCheck, AlertTriangle, ListFilter, ClipboardCheck, 
  CheckCircle2, FolderDot, Volume2, Search, Edit2, X, PlusCircle, Waves, Menu
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

  const [activeTab, setActiveTab] = useState<"overview" | "volunteers" | "tasks" | "opportunities" | "messages">("overview");
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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

  // Destructive confirmations
  const [isDeactivateConfirmOpen, setIsDeactivateConfirmOpen] = useState(false);
  const [volToDeactivate, setVolToDeactivate] = useState<string | null>(null);

  const [isDeleteTaskConfirmOpen, setIsDeleteTaskConfirmOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

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
        acc[s.opportunity_id] = (acc[s.opportunity_id] || 0) + 1;
        return acc;
      }, {});

      const mappedOpps: OpportunityWithSite[] = (oppsData || []).map(o => ({
        ...o,
        signup_count: signupCounts[o.id] || 0,
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

      // Defaults
      if (sitesData && sitesData.length > 0) {
        setVolSitePref(sitesData[0].id);
        setOppSiteId(sitesData[0].id);
        setBulkTaskSite(sitesData[0].id);
      }
      if (mappedVols.length > 0) {
        setTaskAssigneeId(mappedVols[0].profile_id);
        if (!activeThreadVolId) {
          setActiveThreadVolId(mappedVols[0].profile_id);
        }
      }

      // 5. Aggregate metrics
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

  // Handle Add Volunteer (Task 6)
  const handleAddVolunteerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!volName.trim() || !volEmail.trim() || !volPhone.trim() || !volEmergency.trim()) {
      showToast("Please fill in all required registration fields", "error");
      return;
    }

    setIsSubmittingVol(true);
    try {
      // 1. Generate secure random password
      const generateTempPassword = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
        return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('') + '!';
      };
      const tempPassword = generateTempPassword();

      // 2. SignUp on Supabase
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: volEmail,
        password: tempPassword,
      });

      if (authErr) throw new Error(authErr.message);
      if (!authData.user) throw new Error("Could not create authentication profile");

      // 3. Create profile row
      const { error: profileErr } = await supabase.from("profiles").insert({
        id: authData.user.id,
        role: "volunteer",
        full_name: volName,
        email: volEmail,
        phone: volPhone,
        must_reset_password: true
      });

      if (profileErr) throw new Error(profileErr.message);

      // 4. Create volunteer row
      const volCode = `OSI-VOL-${String(Math.floor(1000 + Math.random() * 9000))}`;
      const { error: volErr } = await supabase.from("volunteers").insert({
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

      // Reset Form fields
      setVolName("");
      setVolEmail("");
      setVolPhone("");
      setVolInterests([]);
      setVolEmergency("");
      setIsAddVolOpen(false);

      // Display Credential Modal
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
      // Find all volunteers matching this preferred site preference
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

  // Add Opportunity
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
      // Get registered signups to checkboxes
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
        // Find volunteers matching preferred site Preference ID
        const { data, error } = await supabase
          .from("volunteers")
          .select("profile_id")
          .eq("site_preference_id", broadcastTarget)
          .eq("coordinator_id", user!.id);

        if (error) throw new Error(error.message);
        targetVols = data || [];
      } else {
        // Filter by tags / interests
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

  // Cycle Kanban Status (<768px)
  const handleCycleTaskStatus = async (task: Task) => {
    const cycleMap: { [key: string]: "todo" | "in_progress" | "done" } = {
      todo: "in_progress",
      in_progress: "done",
      done: "todo"
    };
    const nextStatus = cycleMap[task.status] || "todo";
    await handleMoveTaskStatus(task.id, nextStatus);
  };

  // Kanban update column
  const handleMoveTaskStatus = async (taskId: string, targetStatus: "todo" | "in_progress" | "done") => {
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ status: targetStatus })
        .eq("id", taskId);

      if (error) throw new Error(error.message);

      showToast(`Task status updated to ${targetStatus === "in_progress" ? "In Progress" : targetStatus === "todo" ? "To Do" : "Done"}.`, "info");
      loadAllData();
    } catch (err: any) {
      showToast("Failed to alter task parameters", "error");
    }
  };

  // Delete task
  const handleDeleteTaskConfirm = async () => {
    if (!taskToDelete) return;
    try {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", taskToDelete);

      if (error) throw new Error(error.message);

      showToast("Task deleted successfully", "warning");
      setIsDeleteTaskConfirmOpen(false);
      setTaskToDelete(null);
      loadAllData();
    } catch (err: any) {
      showToast("Failed to delete task", "error");
    }
  };

  // Deactivate profile
  const handleDeactivateConfirm = async () => {
    if (!volToDeactivate) return;
    try {
      const { error } = await supabase
        .from("volunteers")
        .update({ status: "inactive" })
        .eq("profile_id", volToDeactivate);

      if (error) throw new Error(error.message);

      showToast("Volunteer profile has been deactivated", "warning");
      setIsDeactivateConfirmOpen(false);
      setVolToDeactivate(null);
      setSelectedVolId(null);
      loadAllData();
    } catch (err: any) {
      showToast("Failed to alter volunteer status", "error");
    }
  };

  const handleToggleTag = (tag: string) => {
    setVolInterests(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast("Credentials copied to clipboard securely!", "success");
  };

  // Helper arrays
  const activeThread = messages.filter(
    (m) => m.sender_id === activeThreadVolId || m.recipient_id === activeThreadVolId
  );
  const activeVolProfile = volunteers.find((v) => v.profile_id === activeThreadVolId)?.profile;

  const filteredVolunteers = volunteers
    .filter((v) => v && v.profile)
    .filter((v) => {
      const query = volSearch.toLowerCase();
      const fullName = v.profile?.full_name || "Unknown User";
      const volunteerCode = v.volunteer_code || "";
      const siteName = v.site_name || "";
      return (
        fullName.toLowerCase().includes(query) ||
        volunteerCode.toLowerCase().includes(query) ||
        siteName.toLowerCase().includes(query)
      );
    });

  const selectedVolDetail = volunteers.find(v => v.profile_id === selectedVolId);

  const WaveDivider = ({ className = "" }: { className?: string }) => (
    <div className={`w-full overflow-hidden leading-[0] ${className}`}>
      <svg viewBox="0 0 1200 12" className="relative block w-full h-[8px] fill-current" preserveAspectRatio="none">
        <path d="M0,0 C150,9 350,-3 500,6 C650,15 850,3 1000,0 C1150,-3 1200,6 1200,6 L1200,12 L0,12 Z" />
      </svg>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col font-sans" style={{ background: "linear-gradient(180deg, #F8F9FA 0%, #D8EFF2 60%, #62B6CB 100%)" }}>
      
      {/* Top Banner Header */}
      <header className="sticky top-0 z-40 bg-[#023E8A] text-white px-6 py-4 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-2.5">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="md:hidden p-2 hover:bg-white/10 rounded-lg text-white"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <Waves className="w-7 h-7 text-cyan animate-pulse shrink-0" />
          <div>
            <span className="font-serif font-black text-white text-base tracking-tight block leading-none">OCEAN SCHOOL INDIA</span>
            <span className="text-[9px] font-semibold text-slate-300 uppercase tracking-widest block leading-none mt-0.5">Coordinator Console</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col text-right hidden sm:block">
            <span className="text-xs font-bold text-white block leading-none">{user?.full_name}</span>
            <span className="text-[10px] font-mono text-[#62B6CB] font-bold uppercase tracking-wider block mt-1">Staff Lead</span>
          </div>
          <Button variant="ghost" onClick={logout} className="text-xs font-semibold py-3 px-4 min-h-[44px] text-white hover:bg-white/10 hover:text-white">
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main Grid Drawer/Sidebar + Content Layout */}
      <div className="flex-1 flex flex-col md:flex-row relative">
        
        {/* MOBILE OVERLAY DRAWER */}
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
                      <span className="font-serif font-bold text-deep text-sm">OSI Console</span>
                    </div>
                    <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-slate-50 rounded-full">
                      <X className="w-5 h-5 text-slate-400" />
                    </button>
                  </div>

                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2 block">Management</span>
                  <div className="flex flex-col gap-1.5">
                    {[
                      { tab: "overview", label: "Overview Console", icon: <FolderDot className="w-4 h-4" /> },
                      { tab: "volunteers", label: "My Volunteers", icon: <Users className="w-4 h-4" /> },
                      { tab: "tasks", label: "Task Board", icon: <CheckSquare className="w-4 h-4" /> },
                      { tab: "opportunities", label: "Campaigns Board", icon: <Calendar className="w-4 h-4" /> },
                      { tab: "messages", label: "Staff Inbox", icon: <MessageSquare className="w-4 h-4" /> }
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

                <div className="border-t border-slate-100 pt-4 text-xs text-slate-400 leading-relaxed">
                  <span className="font-bold text-deep block mb-0.5">Assigned Sector:</span>
                  Lakshadweep & Mumbai
                </div>
              </motion.aside>
            </div>
          )}
        </AnimatePresence>

        {/* PERSISTENT DESKTOP LEFT SIDEBAR */}
        <aside className="hidden md:flex md:w-64 bg-white border-r border-slate-100 p-4 flex flex-col gap-1 shrink-0 h-calc sticky top-24">
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
            <span className="font-bold text-deep block mb-0.5">Assigned Sector:</span>
            Lakshadweep & Mumbai Estuaries
          </div>
        </aside>

        {/* Content Panel */}
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
                    
                    {/* Quick statistics strip */}
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
                      <Card title="Registry Pool" subtitle="Assigned volunteers" className="text-center" glass="light">
                        <span className="font-serif font-black text-3xl text-[#023E8A]">{stats.totalVolunteers}</span>
                      </Card>
                      <Card title="Active Field Staff" subtitle="Logged in this week" className="text-center" glass="light">
                        <span className="font-serif font-black text-3xl text-[#023E8A]">{stats.activeThisWeek}</span>
                      </Card>
                      <Card title="Total Lab Hours" subtitle="Credits approved" className="text-center" glass="light">
                        <span className="font-serif font-black text-3xl text-[#023E8A]">{stats.hoursLogged}h</span>
                      </Card>
                      <Card title="Open Tasks" subtitle="Awaiting completion" className="text-center" glass="light">
                        <span className="font-serif font-black text-3xl text-[#023E8A]">{stats.openTasks}</span>
                      </Card>
                      <Card title="Direct Unread" subtitle="Direct citizen logs" className="text-center" glass="light">
                        <span className="font-serif font-black text-3xl text-[#023E8A]">{stats.unreadMessages}</span>
                      </Card>
                    </div>

                    {/* Action grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      
                      {/* Quick actions box */}
                      <Card title="Regional Operations Quick Launch" subtitle="Operational shortcuts for daily coordinator tasks" glass="light">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <button
                            onClick={() => setIsAddVolOpen(true)}
                            className="p-4 rounded-xl border border-white/50 bg-white/40 hover:bg-white/70 hover:border-white/80 transition text-left flex items-start gap-4 cursor-pointer group min-h-[44px]"
                          >
                            <PlusCircle className="w-8 h-8 text-[#0096C7] shrink-0" />
                            <div>
                              <h4 className="font-bold text-xs text-[#023E8A] group-hover:text-[#0096C7]">Add Volunteer</h4>
                              <p className="text-[10px] text-slate-600 mt-1 leading-relaxed">Launch intake interview form & issue security profile credentials.</p>
                            </div>
                          </button>

                          <button
                            onClick={() => setIsAddTaskOpen(true)}
                            className="p-4 rounded-xl border border-white/50 bg-white/40 hover:bg-white/70 hover:border-white/80 transition text-left flex items-start gap-4 cursor-pointer group min-h-[44px]"
                          >
                            <CheckSquare className="w-8 h-8 text-[#0096C7] shrink-0" />
                            <div>
                              <h4 className="font-bold text-xs text-[#023E8A] group-hover:text-[#0096C7]">New Task</h4>
                              <p className="text-[10px] text-slate-600 mt-1 leading-relaxed">Assign individual bio-indicator testing or cleanup safety checks.</p>
                            </div>
                          </button>

                          <button
                            onClick={() => setIsBulkTaskOpen(true)}
                            className="p-4 rounded-xl border border-white/50 bg-white/40 hover:bg-white/70 hover:border-white/80 transition text-left flex items-start gap-4 cursor-pointer group min-h-[44px]"
                          >
                            <ListFilter className="w-8 h-8 text-[#0096C7] shrink-0" />
                            <div>
                              <h4 className="font-bold text-xs text-[#023E8A] group-hover:text-[#0096C7]">Bulk Site Task</h4>
                              <p className="text-[10px] text-slate-600 mt-1 leading-relaxed">Broadcast tasks to all active volunteers matching a site preference.</p>
                            </div>
                          </button>

                          <button
                            onClick={() => setIsBroadcastOpen(true)}
                            className="p-4 rounded-xl border border-white/50 bg-white/40 hover:bg-white/70 hover:border-white/80 transition text-left flex items-start gap-4 cursor-pointer group min-h-[44px]"
                          >
                            <Volume2 className="w-8 h-8 text-[#0096C7] shrink-0" />
                            <div>
                              <h4 className="font-bold text-xs text-[#023E8A] group-hover:text-[#0096C7]">Broadcast Msg</h4>
                              <p className="text-[10px] text-slate-600 mt-1 leading-relaxed">Broadcast messages instantly to site-specific groups or interest tags.</p>
                            </div>
                          </button>
                        </div>
                      </Card>

                      {/* Recent activity summary info */}
                      <Card title="Active Field Roster Summary" subtitle="Roster outline for quick operational monitoring" glass="light">
                        {volunteers.length === 0 ? (
                          <div className="text-center p-6 text-slate-500">
                            No volunteers assigned yet. Use "Add Volunteer" to register.
                          </div>
                        ) : (
                          <div className="flex flex-col gap-3">
                            {volunteers.slice(0, 4).map((vol) => (
                              <div key={vol.profile_id} className="p-3.5 bg-white/40 border border-white/50 rounded-xl flex justify-between items-center text-xs">
                                <div className="flex items-center gap-3">
                                  <Avatar name={vol.profile.full_name} size="sm" />
                                  <div>
                                    <span className="font-bold text-[#023E8A] block">{vol.profile.full_name}</span>
                                    <span className="text-[10px] text-slate-500 block mt-0.5 font-mono">{vol.site_name || "General"}</span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="font-bold block text-[#1B4965]">{vol.hours_logged}h</span>
                                  <Badge status={vol.status} className="text-[9px]" />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </Card>

                    </div>
                  </div>
                )}

                {/* --- TAB: MY VOLUNTEERS --- */}
                {activeTab === "volunteers" && (
                  <div className="flex flex-col gap-6">
                    
                    <div className="flex flex-col sm:flex-row gap-4 justify-between items-center border-b border-slate-100 pb-4">
                      <div className="w-full sm:max-w-xs relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                        <input
                          type="text"
                          placeholder="Search volunteers code or site..."
                          value={volSearch}
                          onChange={(e) => setVolSearch(e.target.value)}
                          className="w-full pl-9 pr-4 py-3 text-xs border border-slate-200 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan min-h-[44px]"
                        />
                      </div>

                      <Button onClick={() => setIsAddVolOpen(true)} className="w-full sm:w-auto text-xs py-3 px-4 min-h-[44px]">
                        <Plus className="w-4 h-4" />
                        Register New Volunteer
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      
                      {/* Left list roster */}
                      <Card title="Assigned Volunteers Roster" subtitle={`Matching: ${filteredVolunteers.length}`} className="lg:col-span-2">
                        {filteredVolunteers.length === 0 ? (
                          <EmptyState 
                            title="No matching volunteers" 
                            description="No active or pending volunteers found matching your query." 
                            icon={<Users className="w-10 h-10 text-cyan" />}
                          />
                        ) : (
                          <>
                            {/* Desktop Table */}
                            <div className="hidden md:block overflow-x-auto">
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
                                      <td className="py-3 text-slate-500 font-medium">{vol.site_name || "General Support"}</td>
                                      <td className="py-3 font-bold text-slate-700">{vol.hours_logged}h</td>
                                      <td className="py-3"><Badge status={vol.status} className="text-[10px]" /></td>
                                      <td className="py-3 text-right">
                                        <Button variant="ghost" onClick={() => setSelectedVolId(vol.profile_id)} className="text-[10px] p-2 h-auto min-h-[32px]">
                                          View
                                        </Button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Mobile Stacked Cards (<768px) */}
                            <div className="md:hidden flex flex-col gap-4">
                              {filteredVolunteers.map((vol) => (
                                <div 
                                  key={vol.profile_id}
                                  onClick={() => setSelectedVolId(vol.profile_id)}
                                  className={`p-4 rounded-xl border text-xs transition ${
                                    selectedVolId === vol.profile_id ? "border-cyan bg-sky-50/20" : "border-slate-100 bg-white"
                                  }`}
                                >
                                  <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2.5">
                                      <Avatar name={vol.profile.full_name} size="sm" />
                                      <div>
                                        <span className="font-bold text-deep block">{vol.profile.full_name}</span>
                                        <span className="text-[10px] text-slate-400 font-mono">{vol.volunteer_code}</span>
                                      </div>
                                    </div>
                                    <Badge status={vol.status} />
                                  </div>

                                  <div className="mt-3 grid grid-cols-2 text-[10px] text-slate-500 border-t border-slate-50 pt-2">
                                    <div>SITE: <span className="font-bold text-slate-700">{vol.site_name || "General"}</span></div>
                                    <div className="text-right">LOGGED: <span className="font-bold text-slate-700">{vol.hours_logged}h</span></div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </Card>

                      {/* Right desk detailed pane */}
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
                                <p className="font-semibold text-deep leading-relaxed">{selectedVolDetail.site_name || "General"}</p>
                                <p className="text-slate-500 mt-0.5">{selectedVolDetail.availability}</p>
                              </div>

                              <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Emergency Contacts</span>
                                <p className="font-semibold text-deep leading-relaxed">{selectedVolDetail.emergency_contact || "Not provided"}</p>
                              </div>

                              <div className="border-t border-slate-100 pt-4 flex gap-3">
                                <Button 
                                  variant="danger" 
                                  onClick={() => { setVolToDeactivate(selectedVolDetail.profile_id); setIsDeactivateConfirmOpen(true); }} 
                                  className="flex-1 text-[10px] py-3 px-4 min-h-[44px]"
                                >
                                  Deactivate Profile
                                </Button>
                                <Button 
                                  variant="secondary" 
                                  onClick={() => { setActiveThreadVolId(selectedVolDetail.profile_id); setActiveTab("messages"); }} 
                                  className="flex-1 text-[10px] py-3 px-4 min-h-[44px]"
                                >
                                  Direct message
                                </Button>
                              </div>
                            </div>
                          </Card>
                        ) : (
                          <div className="h-full rounded-xl bg-white border border-dashed border-slate-200 p-8 flex flex-col items-center justify-center text-center">
                            <Users className="w-10 h-10 text-slate-300 mb-2 animate-bounce" />
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
                    <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center border-b border-slate-100 pb-4">
                      <div>
                        <h2 className="font-serif font-black text-xl text-deep">Task Kanban Board</h2>
                        <p className="text-slate-400 text-xs mt-0.5">Track and manage bio-indicator tasks assigned to your volunteer unit.</p>
                      </div>

                      <div className="flex gap-2 w-full sm:w-auto">
                        <Button variant="secondary" onClick={() => setIsBulkTaskOpen(true)} className="flex-1 sm:flex-initial text-xs py-3 px-4 min-h-[44px]">
                          <ListFilter className="w-4 h-4" />
                          Bulk Site Assign
                        </Button>
                        <Button onClick={() => setIsAddTaskOpen(true)} className="flex-1 sm:flex-initial text-xs py-3 px-4 min-h-[44px]">
                          <Plus className="w-4 h-4" />
                          Assign Individual Task
                        </Button>
                      </div>
                    </div>

                    {/* DESKTOP COLUMN KANBAN VIEW */}
                    <div className="hidden md:grid grid-cols-1 lg:grid-cols-3 gap-6">
                      
                      {/* Column: To Do */}
                      <div className="flex flex-col gap-4">
                        <div className="p-3 bg-white/50 backdrop-blur-md rounded-xl border border-white/60 flex justify-between items-center shadow-xs text-[#1B4965]">
                          <span className="text-xs font-bold uppercase tracking-wide">To Do</span>
                          <span className="px-2.5 py-0.5 bg-white/60 rounded text-[10px] font-bold text-slate-700">
                            {tasks.filter(t => t.status === "todo").length}
                          </span>
                        </div>

                        <div className="flex flex-col gap-3 min-h-[50vh] bg-white/30 backdrop-blur-md p-3 rounded-xl border border-white/40 shadow-inner">
                          {tasks.filter(t => t.status === "todo").length === 0 ? (
                            <p className="text-xs text-slate-600 italic text-center py-8">No tasks here</p>
                          ) : (
                            tasks.filter(t => t.status === "todo").map((task) => (
                              <div key={task.id} className="bg-white/80 p-4 rounded-xl border border-white/50 shadow-sm hover:bg-white/95 transition relative group text-[#1B4965]">
                                <div className="flex justify-between items-start gap-2">
                                  <span className="text-[10px] font-mono text-[#0096C7] font-bold">{task.volunteer_name}</span>
                                  <Badge status={task.priority} className="text-[9px] px-1.5 py-0" />
                                </div>
                                <h4 className="font-bold text-xs text-[#023E8A] mt-2 leading-snug">{task.title}</h4>
                                <p className="text-[10px] text-slate-600 mt-1 leading-relaxed">{task.description}</p>
                                
                                <div className="border-t border-white/40 mt-3 pt-2.5 flex justify-between items-center text-[9px] text-slate-500 font-mono">
                                  <span>DUE: {new Date(task.due_date).toLocaleDateString()}</span>
                                  <div className="flex gap-1.5">
                                    <button onClick={() => { setTaskToDelete(task.id); setIsDeleteTaskConfirmOpen(true); }} className="text-coral hover:text-red-700 font-bold min-h-[32px] px-1.5 cursor-pointer">Delete</button>
                                    <button onClick={() => handleMoveTaskStatus(task.id, "in_progress")} className="text-[#023E8A] hover:text-[#1B4965] font-bold min-h-[32px] px-1.5 cursor-pointer">Start &rarr;</button>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Column: In Progress */}
                      <div className="flex flex-col gap-4">
                        <div className="p-3 bg-white/50 backdrop-blur-md rounded-xl border border-white/60 flex justify-between items-center shadow-xs text-[#023E8A]">
                          <span className="text-xs font-bold uppercase tracking-wide">In Progress</span>
                          <span className="px-2.5 py-0.5 bg-white/60 rounded text-[10px] font-bold text-slate-700">
                            {tasks.filter(t => t.status === "in_progress").length}
                          </span>
                        </div>

                        <div className="flex flex-col gap-3 min-h-[50vh] bg-white/30 backdrop-blur-md p-3 rounded-xl border border-white/40 shadow-inner">
                          {tasks.filter(t => t.status === "in_progress").length === 0 ? (
                            <p className="text-xs text-slate-600 italic text-center py-8">No active tasks</p>
                          ) : (
                            tasks.filter(t => t.status === "in_progress").map((task) => (
                              <div key={task.id} className="bg-white/80 p-4 rounded-xl border border-white/50 shadow-sm hover:bg-white/95 transition relative text-[#1B4965]">
                                <div className="flex justify-between items-start gap-2">
                                  <span className="text-[10px] font-mono text-[#0096C7] font-bold">{task.volunteer_name}</span>
                                  <Badge status={task.priority} className="text-[9px] px-1.5 py-0" />
                                </div>
                                <h4 className="font-bold text-xs text-[#023E8A] mt-2 leading-snug">{task.title}</h4>
                                <p className="text-[10px] text-slate-600 mt-1 leading-relaxed">{task.description}</p>
                                
                                <div className="border-t border-white/40 mt-3 pt-2.5 flex justify-between items-center text-[9px] text-slate-500 font-mono">
                                  <span>DUE: {new Date(task.due_date).toLocaleDateString()}</span>
                                  <div className="flex gap-1.5">
                                    <button onClick={() => handleMoveTaskStatus(task.id, "todo")} className="text-slate-500 hover:text-slate-700 font-bold min-h-[32px] px-1.5 cursor-pointer">&larr; Back</button>
                                    <button onClick={() => handleMoveTaskStatus(task.id, "done")} className="text-emerald-700 hover:text-emerald-800 font-bold min-h-[32px] px-1.5 cursor-pointer">Finish &rarr;</button>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Column: Done */}
                      <div className="flex flex-col gap-4">
                        <div className="p-3 bg-white/50 backdrop-blur-md rounded-xl border border-white/60 flex justify-between items-center shadow-xs text-[#1B4965]">
                          <span className="text-xs font-bold uppercase tracking-wide">Done</span>
                          <span className="px-2.5 py-0.5 bg-white/60 rounded text-[10px] font-bold text-slate-700">
                            {tasks.filter(t => t.status === "done").length}
                          </span>
                        </div>

                        <div className="flex flex-col gap-3 min-h-[50vh] bg-white/30 backdrop-blur-md p-3 rounded-xl border border-white/40 shadow-inner">
                          {tasks.filter(t => t.status === "done").length === 0 ? (
                            <p className="text-xs text-slate-600 italic text-center py-8">No completed tasks yet</p>
                          ) : (
                            tasks.filter(t => t.status === "done").map((task) => (
                              <div key={task.id} className="bg-white/60 p-4 rounded-xl border border-white/50 shadow-sm hover:bg-white/95 transition relative opacity-75 text-slate-500">
                                <div className="flex justify-between items-start gap-2">
                                  <span className="text-[10px] font-mono text-[#0096C7] font-bold">{task.volunteer_name}</span>
                                  <Badge status="done" className="text-[9px] px-1.5 py-0" />
                                </div>
                                <h4 className="font-bold text-xs text-slate-400 mt-2 leading-snug line-through">{task.title}</h4>
                                <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">{task.description}</p>
                                
                                <div className="border-t border-white/40 mt-3 pt-2.5 flex justify-between items-center text-[9px] text-slate-400 font-mono">
                                  <span>COMPLETED</span>
                                  <button onClick={() => handleMoveTaskStatus(task.id, "in_progress")} className="text-[#0096C7] hover:text-[#023E8A] font-bold min-h-[32px] px-1.5 cursor-pointer">&larr; Re-open</button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                    </div>

                    {/* MOBILE COLLAPSED KANBAN SINGLE STACK VIEW (<768px) */}
                    <div className="md:hidden flex flex-col gap-4">
                      {tasks.length === 0 ? (
                        <EmptyState
                          title="No tasks assigned yet"
                          description="Get started by creating a new bio-indicator task or safety check."
                          icon={<CheckSquare className="w-10 h-10 text-cyan" />}
                        />
                      ) : (
                        tasks.map((task) => (
                          <div key={task.id} className="p-4 bg-white border border-slate-100 rounded-xl text-xs flex flex-col gap-2 shadow-xs">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-bold text-deep leading-tight text-sm">{task.title}</h4>
                                <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">Assignee: {task.volunteer_name}</span>
                              </div>
                              <Badge status={task.priority} />
                            </div>

                            <p className="text-slate-500 text-[11px] leading-relaxed mt-1">{task.description}</p>

                            <div className="border-t border-slate-50 pt-3 mt-1 flex justify-between items-center">
                              <span className="text-[10px] font-mono text-slate-400">STATUS: <span className="font-bold text-slate-600 uppercase">{task.status.replace("_", " ")}</span></span>
                              <Button 
                                variant="secondary" 
                                onClick={() => handleCycleTaskStatus(task)} 
                                className="text-[10px] py-1.5 px-3 min-h-[44px] inline-flex items-center gap-1"
                              >
                                Move status &rarr;
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                  </div>
                )}

                {/* --- TAB: CAMPAIGNS --- */}
                {activeTab === "opportunities" && (
                  <div className="flex flex-col gap-6">
                    <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center border-b border-slate-100 pb-4">
                      <div>
                        <h2 className="font-serif font-black text-xl text-deep">Coastal Restoration Campaigns</h2>
                        <p className="text-slate-400 text-xs mt-0.5">Create open opportunities, log completions, and assign field hours.</p>
                      </div>

                      <Button onClick={() => setIsAddOppOpen(true)} className="w-full sm:w-auto text-xs py-3 px-4 min-h-[44px]">
                        <Plus className="w-4 h-4" />
                        Create Opportunity Drive
                      </Button>
                    </div>

                    {opportunities.length === 0 ? (
                      <EmptyState
                        title="No active campaigns"
                        description="Ocean School India has no active drives listed. Create one above!"
                        icon={<Calendar className="w-10 h-10 text-cyan" />}
                      />
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {opportunities.map((opp) => {
                          const isCompleted = opp.status === "completed";
                          return (
                            <div key={opp.id} className={`bg-white/45 backdrop-blur-md rounded-xl border border-white/50 overflow-hidden shadow-sm hover:shadow-md transition-all text-[#1B4965] ${isCompleted ? "opacity-75" : ""}`}>
                              <div className="p-5">
                                <div className="flex justify-between items-start">
                                  <Badge status={opp.status} />
                                  <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wide">{opp.commitment_label}</span>
                                </div>

                                <h3 className="font-serif font-bold text-base text-[#023E8A] mt-3">{opp.title}</h3>
                                <p className="text-xs text-slate-600 mt-2 leading-relaxed">{opp.description}</p>

                                <div className="border-t border-white/40 mt-4 pt-3 flex flex-wrap gap-x-4 gap-y-2 text-[10px] text-slate-500 font-mono">
                                  <div>SITE: <span className="font-bold text-slate-700">{opp.site?.name || "Multiple"}</span></div>
                                  <div>DATE: <span className="font-bold text-slate-700">{new Date(opp.date).toLocaleDateString()}</span></div>
                                  <div>CAPACITY: <span className="font-bold text-slate-700">{opp.signup_count}/{opp.capacity}</span></div>
                                </div>
                              </div>

                              <div className="bg-white/30 px-5 py-3 border-t border-white/40 flex justify-between items-center text-xs">
                                <span className="text-[10px] font-mono font-bold text-slate-500">SIGNUPS: {opp.signup_count}</span>
                                {!isCompleted ? (
                                  <Button variant="secondary" onClick={() => handleOpenCompleteCampaign(opp)} className="text-[11px] py-3 px-4 min-h-[44px]">
                                    Complete & Log Hours
                                  </Button>
                                ) : (
                                  <span className="text-xs font-semibold text-emerald-700 inline-flex items-center gap-1.5 font-bold">
                                    <CheckCircle2 className="w-4 h-4" />
                                    Campaign Logged
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
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

                      <Button variant="secondary" onClick={() => setIsBroadcastOpen(true)} className="text-xs py-3 px-4 min-h-[44px]">
                        <Volume2 className="w-4 h-4" />
                        Site Broadcast
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-white/45 backdrop-blur-md border border-white/50 rounded-xl overflow-hidden h-[65vh] shadow-sm">
                      
                      {/* Conversations Side Menu */}
                      <div className="lg:col-span-1 border-r border-white/30 overflow-y-auto flex flex-col divide-y divide-white/20 bg-white/10">
                        <div className="p-4 bg-white/25 text-xs font-bold text-[#023E8A] uppercase tracking-wider font-mono shrink-0 border-b border-white/25">
                          My Thread Contacts
                        </div>

                        {volunteers.length === 0 ? (
                          <div className="p-6 text-center text-xs text-slate-500 italic">
                            No volunteers to chat with yet.
                          </div>
                        ) : (
                          volunteers.map((vol) => {
                            const lastMsg = messages.filter(
                              (m) => m.sender_id === vol.profile_id || m.recipient_id === vol.profile_id
                            ).slice(-1)[0];
                            const hasUnread = lastMsg && lastMsg.recipient_id === user!.id && !lastMsg.read;

                            return (
                              <div
                                key={vol.profile_id}
                                onClick={() => setActiveThreadVolId(vol.profile_id)}
                                className={`p-4 flex items-center justify-between cursor-pointer hover:bg-white/25 transition ${activeThreadVolId === vol.profile_id ? "bg-white/35" : ""}`}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <Avatar name={vol.profile.full_name} size="sm" />
                                  <div className="min-w-0">
                                    <span className="font-semibold text-[#023E8A] text-xs block truncate">{vol.profile.full_name}</span>
                                    <span className="text-[10px] text-slate-500 block truncate max-w-[150px] mt-0.5 font-medium">
                                      {lastMsg ? lastMsg.body : "No messages yet"}
                                    </span>
                                  </div>
                                </div>

                                {hasUnread && (
                                  <span className="w-2.5 h-2.5 rounded-full bg-[#0096C7] shrink-0 ml-2" />
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Conversation thread box */}
                      <div className="lg:col-span-2 flex flex-col h-full justify-between bg-white/5 min-w-0">
                        {activeVolProfile ? (
                          <>
                            {/* Thread header */}
                            <div className="px-6 py-4 bg-white/40 border-b border-white/45 flex justify-between items-center shrink-0">
                              <div className="flex items-center gap-3">
                                <Avatar name={activeVolProfile.full_name} size="sm" />
                                <div>
                                  <span className="font-bold text-[#023E8A] text-xs block leading-none">{activeVolProfile.full_name}</span>
                                  <span className="text-[10px] text-slate-500 font-mono tracking-wider mt-1.5 block">SECURE DIRECT 1:1 LINE</span>
                                </div>
                              </div>
                            </div>

                            {/* Thread messages list */}
                            <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-3">
                              {activeThread.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-center">
                                  <p className="text-xs text-slate-500 italic">No historical messages found. Begin conversation below.</p>
                                </div>
                              ) : (
                                activeThread.map((msg) => {
                                  const isMe = msg.sender_id === user!.id;
                                  return (
                                    <div
                                      key={msg.id}
                                      className={`max-w-[75%] p-3.5 rounded-xl text-xs leading-relaxed ${
                                        isMe
                                          ? "bg-[#023E8A] text-white rounded-br-none self-end shadow-xs"
                                          : "bg-white/80 text-[#1B4965] border border-white/50 backdrop-blur-md rounded-bl-none self-start shadow-xs"
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
                              <div ref={messagesEndRef} />
                            </div>

                            {/* Msg input */}
                            <form onSubmit={handleSendStaffMessage} className="bg-white/40 border-t border-white/45 p-4 flex gap-3 shrink-0">
                              <input
                                type="text"
                                placeholder={`Type direct message to ${activeVolProfile.full_name}...`}
                                value={newStaffMessage}
                                onChange={(e) => setNewStaffMessage(e.target.value)}
                                className="flex-1 px-4 py-3 text-xs border border-white/50 bg-white/70 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0096C7] min-h-[44px]"
                              />
                              <button
                                type="submit"
                                disabled={!newStaffMessage.trim() || isSendingMessage}
                                className="px-5 py-3 bg-[#023E8A] hover:bg-[#1B4965] disabled:opacity-50 text-white rounded-xl text-xs font-bold shrink-0 transition inline-flex items-center gap-1.5 cursor-pointer min-h-[44px]"
                              >
                                Send
                                <Send className="w-3.5 h-3.5" />
                              </button>
                            </form>
                          </>
                        ) : (
                          <div className="h-full flex items-center justify-center text-center p-8">
                            <div>
                              <MessageSquare className="w-10 h-10 text-slate-400 mx-auto mb-2 animate-pulse" />
                              <h4 className="font-serif font-bold text-[#023E8A] text-sm">Select Conversation</h4>
                              <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1 leading-relaxed">Select an active volunteer from the left contact list to establish a direct secure message channel.</p>
                            </div>
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          )}
        </main>
      </div>

      {/* --- MODAL: ADD VOLUNTEER --- */}
      <Modal isOpen={isAddVolOpen} onClose={() => setIsAddVolOpen(false)} title="Volunteer Intake Registration Form">
        <form onSubmit={handleAddVolunteerSubmit} className="flex flex-col gap-4">
          <Input
            label="Full Name *"
            placeholder="E.g. Sneha Patel"
            value={volName}
            onChange={(e) => setVolName(e.target.value)}
            className="py-3"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Email Address *"
              type="email"
              placeholder="e.g. name@gmail.com"
              value={volEmail}
              onChange={(e) => setVolEmail(e.target.value)}
              className="py-3"
              required
            />
            <Input
              label="Phone Number *"
              placeholder="+91 XXXXX XXXXX"
              value={volPhone}
              onChange={(e) => setVolPhone(e.target.value)}
              className="py-3"
              required
            />
          </div>

          <Select
            label="Preferred Location Site *"
            value={volSitePref}
            onChange={(e) => setVolSitePref(e.target.value)}
            options={sites.map(s => ({ value: s.id, label: `${s.name} (${s.category})` }))}
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
            label="Emergency Contact & Relationship *"
            placeholder="Kiran Patel (Father) - +91 XXXXX XXXXX"
            value={volEmergency}
            onChange={(e) => setVolEmergency(e.target.value)}
            className="py-3"
            required
          />

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={() => setIsAddVolOpen(false)} className="py-3 px-4 min-h-[44px]">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmittingVol} className="py-3 px-4 min-h-[44px]">
              {isSubmittingVol ? "Generating Profile..." : "Register & Generate Profile"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL: CONFIRM CREDENTIALS SLIP (Task 6) --- */}
      <Modal isOpen={credentialsModalOpen} onClose={() => setCredentialsModalOpen(false)} title="Credentials Share-Slip Generated">
        {createdCredentials && (
          <div className="flex flex-col gap-4 text-xs">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 flex gap-3 text-emerald-800 leading-relaxed mb-2">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
              <div>
                <span className="font-bold">Credential Slip Generated!</span> Copy and send this slip securely to the new volunteer. They will be forced to set a new password on their first login.
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 font-mono text-slate-600 select-all flex flex-col gap-2">
              <div>
                <span className="font-bold text-deep">Volunteer Registry Code:</span> {createdCredentials.volunteer_code}
              </div>
              <div>
                <span className="font-bold text-deep">Secure Portal ID:</span> {createdCredentials.email}
              </div>
              <div>
                <span className="font-bold text-deep">Temporary Password:</span> <span className="text-coral font-bold">{createdCredentials.password}</span>
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-4">
              <Button variant="ghost" onClick={() => setCredentialsModalOpen(false)} className="py-3 px-4 min-h-[44px]">
                Close Window
              </Button>
              <Button 
                onClick={() => copyToClipboard(`Ocean School India - Volunteer Login\nRegistry Code: ${createdCredentials.volunteer_code}\nPortal ID: ${createdCredentials.email}\nTemporary Password: ${createdCredentials.password}`)}
                className="py-3 px-4 min-h-[44px]"
              >
                Copy Credentials Slip
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* --- DEACTIVATE VOLUNTEER CONFIRMATION MODAL --- */}
      <Modal isOpen={isDeactivateConfirmOpen} onClose={() => setIsDeactivateConfirmOpen(false)} title="Confirm Profile Deactivation">
        <div className="flex flex-col gap-4 text-xs text-slate-600">
          <p className="font-semibold text-deep text-sm">Are you absolutely sure you want to deactivate this volunteer profile?</p>
          <p>They will immediately lose access to their Depth Gauge console, task lists, and messaging. This action should only be triggered if a volunteer moves out of the conservation program.</p>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="ghost" onClick={() => setIsDeactivateConfirmOpen(false)} className="py-3 px-4 min-h-[44px]">Cancel</Button>
            <Button variant="danger" onClick={handleDeactivateConfirm} className="py-3 px-4 min-h-[44px]">Deactivate Now</Button>
          </div>
        </div>
      </Modal>

      {/* --- DELETE TASK CONFIRMATION MODAL --- */}
      <Modal isOpen={isDeleteTaskConfirmOpen} onClose={() => setIsDeleteTaskConfirmOpen(false)} title="Confirm Task Deletion">
        <div className="flex flex-col gap-4 text-xs text-slate-600">
          <p className="font-semibold text-deep text-sm">Are you sure you want to delete this task assignment?</p>
          <p>This will erase the task description, priority status, and historical logs permanently from the database index. This action is irreversible.</p>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="ghost" onClick={() => setIsDeleteTaskConfirmOpen(false)} className="py-3 px-4 min-h-[44px]">Cancel</Button>
            <Button variant="danger" onClick={handleDeleteTaskConfirm} className="py-3 px-4 min-h-[44px]">Delete Assignment</Button>
          </div>
        </div>
      </Modal>

      {/* --- MODAL: INDIVIDUAL TASK CREATOR --- */}
      <Modal isOpen={isAddTaskOpen} onClose={() => setIsAddTaskOpen(false)} title="Assign Individual Task">
        <form onSubmit={handleAddTaskSubmit} className="flex flex-col gap-4">
          <Input
            label="Task Title *"
            placeholder="Water sampling bottle deliver..."
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            className="py-3"
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
            label="Assignee Volunteer *"
            value={taskAssigneeId}
            onChange={(e) => setTaskAssigneeId(e.target.value)}
            options={volunteers
              .filter(v => v && v.profile)
              .map(v => ({
                value: v.profile_id,
                label: `${v.profile?.full_name || "Unknown User"} (${v.volunteer_code || ""})`
              }))}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Due Date *"
              type="date"
              value={taskDueDate}
              onChange={(e) => setTaskDueDate(e.target.value)}
              className="py-3"
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
            <Button type="button" variant="ghost" onClick={() => setIsAddTaskOpen(false)} className="py-3 px-4 min-h-[44px]">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmittingTask} className="py-3 px-4 min-h-[44px]">
              {isSubmittingTask ? "Dispatching..." : "Dispatch Task"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL: BULK SITE TASK ASSIGNER --- */}
      <Modal isOpen={isBulkTaskOpen} onClose={() => setIsBulkTaskOpen(false)} title="Bulk Site Task Assigner">
        <form onSubmit={handleBulkTaskSubmit} className="flex flex-col gap-4">
          <Input
            label="Bulk Task Title *"
            placeholder="Safety equipment verify..."
            value={bulkTaskTitle}
            onChange={(e) => setBulkTaskTitle(e.target.value)}
            className="py-3"
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
            label="Target Site Group *"
            value={bulkTaskSite}
            onChange={(e) => setBulkTaskSite(e.target.value)}
            options={sites.map(s => ({ value: s.id, label: s.name }))}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Due Date *"
              type="date"
              value={bulkTaskDueDate}
              onChange={(e) => setBulkTaskDueDate(e.target.value)}
              className="py-3"
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
            <Button type="button" variant="ghost" onClick={() => setIsBulkTaskOpen(false)} className="py-3 px-4 min-h-[44px]">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmittingBulkTask} className="py-3 px-4 min-h-[44px]">
              {isSubmittingBulkTask ? "Dispatching Bulk..." : "Dispatch Bulk Task"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL: CREATE OPPORTUNITY DRIVE --- */}
      <Modal isOpen={isAddOppOpen} onClose={() => setIsAddOppOpen(false)} title="Create Restoration Campaign Drive">
        <form onSubmit={handleAddOppSubmit} className="flex flex-col gap-4">
          <Input
            label="Opportunity Title *"
            placeholder="E.g. Mangrove Density Survey..."
            value={oppTitle}
            onChange={(e) => setOppTitle(e.target.value)}
            className="py-3"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Assigned Site Sector *"
              value={oppSiteId}
              onChange={(e) => setOppSiteId(e.target.value)}
              options={sites.map(s => ({ value: s.id, label: s.name }))}
            />

            <Input
              label="Campaign Type *"
              placeholder="Creek Cleanup / Coral survey..."
              value={oppType}
              onChange={(e) => setOppType(e.target.value)}
              className="py-3"
              required
            />
          </div>

          <Textarea
            label="Campaign Action Description *"
            placeholder="Detail muddy boot requirements, open cert constraints or hydration details."
            value={oppDesc}
            onChange={(e) => setOppDesc(e.target.value)}
            rows={3}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Commitment Label *"
              placeholder="e.g. 4 hours"
              value={oppCommitment}
              onChange={(e) => setOppCommitment(e.target.value)}
              className="py-3"
              required
            />

            <Input
              label="Target Drive Date *"
              type="date"
              value={oppDate}
              onChange={(e) => setOppDate(e.target.value)}
              className="py-3"
              required
            />

            <Input
              label="Capacity (Volunteers) *"
              type="number"
              value={oppCapacity}
              onChange={(e) => setOppCapacity(e.target.value)}
              className="py-3"
              required
            />
          </div>

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

      {/* --- MODAL: COMPLETE CAMPAIGN & LOG ATTENDANCE --- */}
      <Modal isOpen={isCompleteOppOpen} onClose={() => setIsCompleteOppOpen(false)} title="Finalise Campaign & Credit Hours">
        {selectedOppForComplete && (
          <form onSubmit={handleCompleteCampaignSubmit} className="flex flex-col gap-4">
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 flex gap-2 text-amber-800 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Finalising completes the campaign and automatically credits the specified hours to checked volunteers.</span>
            </div>

            <h4 className="font-bold text-xs text-deep">Drive Title: {selectedOppForComplete.title}</h4>

            <Input
              label="Hours to Credit (Numerical) *"
              type="number"
              value={hoursToLog}
              onChange={(e) => setHoursToLog(e.target.value)}
              className="py-3"
              required
            />

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-deep/70">Attendance Checksheet (Checked = Attended)</span>
              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg bg-white p-3 flex flex-col gap-2">
                {volunteers.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-4">No volunteers registered to checklist.</p>
                ) : (
                  volunteers.map(vol => {
                    const isChecked = attendeesList.includes(vol.profile_id);
                    return (
                      <label key={vol.profile_id} className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer p-1 rounded hover:bg-slate-50 min-h-[32px]">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleAttendee(vol.profile_id)}
                          className="w-4 h-4 rounded border-slate-300 text-cyan focus:ring-cyan"
                        />
                        <span className="font-medium">{vol.profile.full_name} ({vol.volunteer_code})</span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
              <Button type="button" variant="ghost" onClick={() => setIsCompleteOppOpen(false)} className="py-3 px-4 min-h-[44px]">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingComplete} className="py-3 px-4 min-h-[44px]">
                {isSubmittingComplete ? "Finalising Logs..." : "Finalise Drive Logs"}
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
              onClick={() => { setBroadcastType("site"); setBroadcastTarget(sites[0]?.id || ""); }}
              className={`py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer min-h-[36px] ${broadcastType === "site" ? "bg-white text-deep shadow-sm" : "text-slate-500"}`}
            >
              Broadcast by Site
            </button>
            <button
              type="button"
              onClick={() => { setBroadcastType("tag"); setBroadcastTarget(interestsList[0]); }}
              className={`py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer min-h-[36px] ${broadcastType === "tag" ? "bg-white text-deep shadow-sm" : "text-slate-500"}`}
            >
              Broadcast by Interest Tag
            </button>
          </div>

          {broadcastType === "site" ? (
            <Select
              label="Target Site Group *"
              value={broadcastTarget}
              onChange={(e) => setBroadcastTarget(e.target.value)}
              options={sites.map(s => ({ value: s.id, label: s.name }))}
            />
          ) : (
            <Select
              label="Target Interest Tag *"
              value={broadcastTarget}
              onChange={(e) => setBroadcastTarget(e.target.value)}
              options={interestsList.map(t => ({ value: t, label: t }))}
            />
          )}

          <Textarea
            label="Broadcast Message Body *"
            placeholder="Type your alert or instruction. An automatic [BROADCAST] header is attached."
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
              {isSubmittingBroadcast ? "Dispatching Broadcast..." : "Dispatch Broadcast"}
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
