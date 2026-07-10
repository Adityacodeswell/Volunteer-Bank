import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Waves, Anchor, User, Calendar, CheckSquare, MessageSquare, 
  BarChart3, ShieldAlert, Award, Send, CheckCircle2, Clock, 
  AlertCircle, ArrowRight, UserCheck, Trash2, Info, Users, PlusCircle, X, Check, CheckCircle
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Button, Input, Select, Badge, Card, Avatar } from "../components/UI";
import { VolunteerWithProfile, OpportunityWithSite, Task, Message, JoinRequest, Profile } from "../types";
import { supabase } from "../supabaseClient";
import { NotificationBell } from "../components/NotificationBell";

function SkeletonCard() {
  return (
    <div className="animate-pulse bg-white border border-slate-100 rounded-xl p-5 flex flex-col gap-4 w-full">
      <div className="h-4 bg-slate-200 rounded w-1/4"></div>
      <div className="h-6 bg-slate-200 rounded w-3/4"></div>
      <div className="h-4 bg-slate-200 rounded w-5/6"></div>
      <div className="flex gap-2 mt-2">
        <div className="h-8 bg-slate-200 rounded w-20"></div>
        <div className="h-8 bg-slate-200 rounded w-20"></div>
      </div>
    </div>
  );
}

function InlineError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="p-6 bg-red-50 border border-red-100 rounded-xl text-center">
      <AlertCircle className="w-10 h-10 text-coral mx-auto mb-3" />
      <h3 className="font-bold text-sm text-red-800">Connection Interrupted</h3>
      <p className="text-xs text-red-600 mt-1 mb-4">{message}</p>
      <Button variant="danger" onClick={onRetry} className="text-xs py-2 px-4">
        Try Refreshing
      </Button>
    </div>
  );
}

export default function VolunteerPortal() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();

  const [depth, setDepth] = useState<number>(0); // 0, 5, 15, 25, 40
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<string | null>(null);

  // Data states
  const [volDetail, setVolDetail] = useState<VolunteerWithProfile | null>(null);
  const [opportunities, setOpportunities] = useState<OpportunityWithSite[]>([]);
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [myUnitTeam, setMyUnitTeam] = useState<any[]>([]);
  const [coordinatorsList, setCoordinatorsList] = useState<Profile[]>([]);
  const [myJoinRequests, setMyJoinRequests] = useState<JoinRequest[]>([]);
  const [stats, setStats] = useState<any>({
    hours: 0,
    visits: 0,
    signups: 0,
    globalVolunteers: 0,
    plasticRemovedKg: 0,
    saplingsCounted: 0,
    raftHouseholdsReached: 0
  });

  // Message compose state
  const [newMessageText, setNewMessageText] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Edit intake state
  const [isEditingIntake, setIsEditingIntake] = useState(false);
  const [editSitePref, setEditSitePref] = useState("");
  const [editEmergencyContact, setEditEmergencyContact] = useState("");
  const [editSitePrefError, setEditSitePrefError] = useState("");
  const [editEmergencyContactError, setEditEmergencyContactError] = useState("");

  const handleAuthError = useCallback(async (msg: string) => {
    showToast(`${msg}. Signing out.`, "error");
    await logout();
  }, [logout, showToast]);

  const loadAllData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setErrorState(null);
    try {
      // 1. Fetch volunteer detailed profile
      const { data: volData, error: volErr } = await supabase
        .from("volunteers")
        .select("*, profile:profiles!volunteers_profile_id_fkey(*), site:sites(name), coordinator:profiles!volunteers_coordinator_id_fkey(full_name)")
        .eq("profile_id", user.id)
        .maybeSingle();

      if (volErr) {
        if (volErr.code === "PGRST301" || (volErr as any).status === 401) {
          handleAuthError("Session expired");
          return;
        }
        throw new Error(volErr.message);
      }

      if (volData) {
        const detail: VolunteerWithProfile = {
          ...volData,
          profile: volData.profile,
          coordinator_name: volData.coordinator?.full_name,
          site_name: volData.site?.name
        };
        setVolDetail(detail);
        setEditSitePref(volData.site_preference_id || "");
        setEditEmergencyContact(volData.emergency_contact || "");

        // Fetch team members in the same unit
        if (volData.coordinator_id) {
          const { data: uvData } = await supabase
            .from("volunteers")
            .select("*, profile:profiles!volunteers_profile_id_fkey(*)")
            .eq("coordinator_id", volData.coordinator_id);
          
          const mappedTeam = (uvData || [])
            .filter(v => v && v.profile)
            .map(v => ({
              ...v,
              full_name: v.profile?.full_name || "Active Volunteer",
              hours_logged: v.hours_logged || 0
            }));
          setMyUnitTeam(mappedTeam);
        }
      }

      // 2. Fetch coordinators list
      const { data: coordsData } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "staff");
      setCoordinatorsList(coordsData || []);

      // 3. Fetch join requests involving this volunteer
      const { data: reqsData } = await supabase
        .from("join_requests")
        .select("*")
        .or(`from_id.eq.${user.id},to_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      let enrichedRequests: JoinRequest[] = [];
      if (reqsData) {
        const staffIds = reqsData.map(r => r.from_id === user.id ? r.to_id : r.from_id).filter(Boolean);
        const { data: staffProfiles } = await supabase
          .from("profiles")
          .select("*")
          .in("id", staffIds);

        const profileMap = (staffProfiles || []).reduce((acc: any, p: any) => {
          if (p && p.id) acc[p.id] = p;
          return acc;
        }, {});

        enrichedRequests = reqsData.map(r => ({
          ...r,
          from_profile: r.from_id === user.id ? user : profileMap[r.from_id],
          to_profile: r.to_id === user.id ? user : profileMap[r.to_id]
        }));
      }
      setMyJoinRequests(enrichedRequests);

      // 4. Fetch open opportunities
      const { data: oppsData, error: oppsErr } = await supabase
        .from("opportunities")
        .select("*, site:sites(name)")
        .eq("status", "open")
        .order("date");

      if (oppsErr) throw new Error(oppsErr.message);

      // 5. Fetch signups for this volunteer
      const { data: signupsData, error: signupsErr } = await supabase
        .from("opportunity_signups")
        .select("*, opportunity:opportunities(*, site:sites(name))")
        .eq("volunteer_id", user.id);

      if (signupsErr) throw new Error(signupsErr.message);

      // 6. Fetch signup counts
      const { data: allSignups, error: allSignupsErr } = await supabase
        .from("opportunity_signups")
        .select("opportunity_id");

      if (allSignupsErr) throw new Error(allSignupsErr.message);

      const signupCounts = (allSignups || []).reduce((acc: any, s: any) => {
        if (s && s.opportunity_id) {
          acc[s.opportunity_id] = (acc[s.opportunity_id] || 0) + 1;
        }
        return acc;
      }, {});

      const signedUpOppIds = new Set(signupsData?.map(s => s.opportunity_id) || []);
      const mappedOpps: OpportunityWithSite[] = (oppsData || []).map(o => ({
        ...o,
        is_signed_up: signedUpOppIds.has(o.id),
        signup_count: o?.id ? signupCounts[o.id] || 0 : 0,
        site: o.site
      }));

      setOpportunities(mappedOpps);

      // 7. Fetch tasks
      const { data: tasksData, error: tasksErr } = await supabase
        .from("tasks")
        .select("*, assigned_by:profiles!tasks_assigned_by_staff_id_fkey(full_name)")
        .eq("assigned_to_volunteer_id", user.id)
        .order("due_date");

      if (tasksErr) throw new Error(tasksErr.message);
      setMyTasks(tasksData || []);

      // 8. Fetch sites
      const { data: sitesData, error: sitesErr } = await supabase
        .from("sites")
        .select("*")
        .order("name");

      if (sitesErr) throw new Error(sitesErr.message);
      setSites(sitesData || []);

      // 9. Stats
      const { count: globalVolunteersCount, error: countErr } = await supabase
        .from("volunteers")
        .select("*", { count: "exact", head: true });

      if (countErr) throw new Error(countErr.message);

      const { data: allVols, error: volsErr } = await supabase
        .from("volunteers")
        .select("hours_logged");

      if (volsErr) throw new Error(volsErr.message);

      const totalHours = allVols?.reduce((sum, v) => sum + (v.hours_logged || 0), 0) || 0;
      const visitsCount = signupsData?.filter(s => s.attended).length || 0;

      setStats({
        hours: volData?.hours_logged || 0,
        visits: visitsCount,
        signups: signupsData?.length || 0,
        globalVolunteers: globalVolunteersCount || 0,
        plasticRemovedKg: totalHours * 12,
        saplingsCounted: totalHours * 5,
        raftHouseholdsReached: Math.floor(totalHours * 1.5)
      });

    } catch (err: any) {
      setErrorState(err.message || "Failed to load database registries");
    } finally {
      setLoading(false);
    }
  }, [user, handleAuthError]);

  // Load message thread
  const fetchMessages = useCallback(async () => {
    if (!user || !volDetail?.coordinator_id) return;
    try {
      const threadId = [user.id, volDetail.coordinator_id].sort().join("::");
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("thread_id", threadId)
        .order("sent_at");

      if (error) throw new Error(error.message);
      setMessages(data || []);

      // Mark read
      await supabase
        .from("messages")
        .update({ read: true })
        .eq("thread_id", threadId)
        .eq("recipient_id", user.id)
        .eq("read", false);

    } catch (err: any) {
      console.error("Messages sync failure", err);
    }
  }, [user, volDetail]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Fetch messages and subscribe
  useEffect(() => {
    if (!user || !volDetail?.coordinator_id) return;
    
    fetchMessages();

    const threadId = [user.id, volDetail.coordinator_id].sort().join("::");
    const channel = supabase.channel(`thread:${threadId}`)
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
  }, [user, volDetail, fetchMessages]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Update Task Status
  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "done" ? "todo" : "done";
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ status: nextStatus })
        .eq("id", taskId);

      if (error) throw new Error(error.message);

      showToast(
        nextStatus === "done" ? "Task completed! Great work." : "Task marked as incomplete", 
        nextStatus === "done" ? "success" : "info"
      );
      loadAllData();
    } catch (err: any) {
      showToast(err.message || "Failed to update task", "error");
    }
  };

  // Sign up for opportunity
  const handleSignUp = async (oppId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("opportunity_signups")
        .insert({
          opportunity_id: oppId,
          volunteer_id: user.id,
          signed_up_at: new Date().toISOString(),
          attended: false
        });

      if (error) throw new Error(error.message);

      showToast("Signed up successfully! Checking commitment requirements.", "success");
      loadAllData();
    } catch (err: any) {
      showToast(err.message || "Failed to register for opportunity", "error");
    }
  };

  // Cancel Signup
  const handleCancelSignUp = async (oppId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("opportunity_signups")
        .delete()
        .eq("opportunity_id", oppId)
        .eq("volunteer_id", user.id);

      if (error) throw new Error(error.message);

      showToast("Your registration has been cancelled.", "warning");
      loadAllData();
    } catch (err: any) {
      showToast(err.message || "Failed to cancel signup", "error");
    }
  };

  // Submit Intake Form (5m)
  const handleUpdateIntake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!volDetail || !user) return;

    // Validation
    let valid = true;
    if (!editSitePref) {
      setEditSitePrefError("Please select a preferred site");
      valid = false;
    } else {
      setEditSitePrefError("");
    }

    if (!editEmergencyContact.trim()) {
      setEditEmergencyContactError("Emergency contact is required");
      valid = false;
    } else if (editEmergencyContact.trim().length < 6) {
      setEditEmergencyContactError("Please specify a valid name and phone contact");
      valid = false;
    } else {
      setEditEmergencyContactError("");
    }

    if (!valid) return;

    try {
      const { error } = await supabase
        .from("volunteers")
        .update({
          site_preference_id: editSitePref,
          emergency_contact: editEmergencyContact
        })
        .eq("profile_id", user.id);

      if (error) throw new Error(error.message);

      showToast("Intake preferences updated successfully", "success");
      setIsEditingIntake(false);
      loadAllData();
    } catch (err: any) {
      showToast(err.message || "Failed to save preferences", "error");
    }
  };

  // Send Message (1:1 Coordinator)
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() || !volDetail || !user) return;

    setIsSendingMessage(true);
    try {
      const threadId = [user.id, volDetail.coordinator_id].sort().join("::");
      const { error } = await supabase
        .from("messages")
        .insert({
          thread_id: threadId,
          sender_id: user.id,
          recipient_id: volDetail.coordinator_id,
          body: newMessageText.trim(),
          sent_at: new Date().toISOString(),
          read: false
        });

      if (error) throw new Error(error.message);

      // Create staff notification
      await supabase.from("notifications").insert({
        user_id: volDetail.coordinator_id,
        type: "new_message",
        title: "New Message from Volunteer",
        body: newMessageText.trim().slice(0, 80),
        read: false
      });

      setNewMessageText("");
      fetchMessages();
    } catch (err: any) {
      showToast(err.message || "Message transmission failed", "error");
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Accept/Decline coordinator invitation
  const handleAcceptInvite = async (req: JoinRequest) => {
    try {
      // Update invite status
      const { error: reqErr } = await supabase
        .from("join_requests")
        .update({ status: "accepted" })
        .eq("id", req.id);

      if (reqErr) throw new Error(reqErr.message);

      // Set volunteer's coordinator
      const { error: volErr } = await supabase
        .from("volunteers")
        .update({ coordinator_id: req.from_id })
        .eq("profile_id", user!.id);

      if (volErr) throw new Error(volErr.message);

      // Notify Coordinator
      await supabase.from("notifications").insert({
        user_id: req.from_id,
        type: "request_accepted",
        title: "Unit Invitation Accepted",
        body: `${user!.full_name} has accepted your invitation to join your unit.`,
        read: false
      });

      showToast("You have successfully joined the coordinator's restoration unit!", "success");
      loadAllData();
    } catch (err: any) {
      showToast(err.message || "Failed to accept unit invitation", "error");
    }
  };

  const handleDeclineInvite = async (req: JoinRequest) => {
    try {
      const { error } = await supabase
        .from("join_requests")
        .update({ status: "declined" })
        .eq("id", req.id);

      if (error) throw new Error(error.message);

      showToast("Unit invitation declined", "info");
      loadAllData();
    } catch (err: any) {
      showToast(err.message || "Failed to decline invitation", "error");
    }
  };

  // Request to join a Coordinator's unit
  const handleRequestJoinUnit = async (coordId: string) => {
    try {
      // Check if pending request exists
      const hasPending = myJoinRequests.some(r => r.to_id === coordId && r.status === "pending");
      if (hasPending) {
        showToast("You already have a pending join request with this coordinator.", "warning");
        return;
      }

      const { error } = await supabase.from("join_requests").insert({
        from_id: user!.id,
        to_id: coordId,
        type: "volunteer_to_staff",
        status: "pending",
        message: "I would like to request to join your marine restoration team."
      });

      if (error) throw new Error(error.message);

      // Notify staff
      await supabase.from("notifications").insert({
        user_id: coordId,
        type: "join_request",
        title: "New Team Unit Request",
        body: `${user!.full_name} has requested to join your restoration unit.`,
        read: false
      });

      showToast("Request to join restoration unit sent to coordinator!", "success");
      loadAllData();
    } catch (err: any) {
      showToast(err.message || "Failed to transmit join request", "error");
    }
  };

  const getBadges = () => {
    if (!volDetail) return [];
    const list = [];
    if (volDetail.hours_logged >= 10) {
      list.push({ title: "Mangrove Guardian", desc: "Logged 10+ conservation hours", color: "bg-emerald-100 text-emerald-800" });
    }
    if (volDetail.site_preference_id) {
      const prefName = volDetail.site_name || "";
      if (prefName.includes("Dive")) {
        list.push({ title: "Reef Explorer", desc: "Active deep dive survey participant", color: "bg-sky-100 text-sky-800" });
      } else {
        list.push({ title: "Wetland Sentry", desc: "Committed to Navi Mumbai lakes & creeks", color: "bg-blue-100 text-blue-800" });
      }
    }
    if (stats.visits >= 1) {
      list.push({ title: "Field Alum", desc: "Completed at least 1 baseline survey", color: "bg-amber-100 text-amber-800" });
    }
    return list;
  };

  const activeBadges = getBadges();
  const coordinatorName = volDetail?.coordinator_name || "Neha Kulkarni";

  const getDepthGradientStyle = (currentDepth: number) => {
    switch (currentDepth) {
      case 0:
        return {
          background: "linear-gradient(180deg, #F8F9FA 0%, #D8EFF2 60%, #62B6CB 100%)",
        };
      case 5:
        return {
          background: "linear-gradient(180deg, #F8F9FA 0%, #62B6CB 50%, #0096C7 100%)",
        };
      case 15:
        return {
          background: "linear-gradient(180deg, #62B6CB 0%, #0096C7 50%, #023E8A 100%)",
        };
      case 25:
        return {
          background: "linear-gradient(180deg, #0096C7 0%, #023E8A 60%, #1B4965 100%)",
        };
      case 40:
      default:
        return {
          background: "linear-gradient(180deg, #023E8A 0%, #1B4965 60%, #112F42 100%)",
        };
    }
  };

  const WaveDivider = ({ className = "" }: { className?: string }) => (
    <div className={`w-full overflow-hidden leading-[0] ${className}`}>
      <svg viewBox="0 0 1200 12" className="relative block w-full h-[8px] fill-current" preserveAspectRatio="none">
        <path d="M0,0 C150,9 350,-3 500,6 C650,15 850,3 1000,0 C1150,-3 1200,6 1200,6 L1200,12 L0,12 Z" />
      </svg>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col font-sans pb-24 lg:pb-0 transition-all duration-700 ease-in-out" style={getDepthGradientStyle(depth)}>
      {/* Header */}
      <header className={`sticky top-0 z-40 backdrop-blur-md border-b px-6 py-4 flex justify-between items-center transition-all duration-500 ${
        depth < 15 
          ? "bg-[#F8F9FA]/80 border-slate-200/50 text-[#023E8A]" 
          : "bg-[#023E8A]/80 border-white/10 text-white"
      }`}>
        <div className="flex items-center gap-2.5">
          <Waves className={`w-7 h-7 animate-pulse ${depth < 15 ? "text-cyan" : "text-white"}`} />
          <div>
            <span className={`font-serif font-black text-base tracking-tight block leading-none ${depth < 15 ? "text-deep" : "text-white"}`}>OCEAN SCHOOL INDIA</span>
            <span className={`text-[9px] font-semibold uppercase tracking-widest block leading-none mt-0.5 ${depth < 15 ? "text-slate-400" : "text-slate-300"}`}>Volunteer Bank</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Notification bell next to Sign Out */}
          <NotificationBell />

          <div className="flex items-center gap-2 text-right hidden sm:block">
            <span className={`text-xs font-bold block leading-none ${depth < 15 ? "text-deep" : "text-white"}`}>{user?.full_name}</span>
            <span className={`text-[10px] font-mono font-bold tracking-wider ${depth < 15 ? "text-cyan" : "text-aqua"}`}>{volDetail?.volunteer_code}</span>
          </div>
          <Button variant="ghost" onClick={logout} className={`text-xs font-semibold py-3 px-4 min-h-[44px] ${depth < 15 ? "" : "text-white hover:bg-white/10 hover:text-white"}`}>
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main Grid: Depth Gauge + Content */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col lg:flex-row gap-8">
        
        {/* DESKTOP DEPTH GAUGE CONTROLLER */}
        <aside className="hidden lg:flex lg:w-64 bg-[#023E8A] text-white rounded-xl p-6 shadow-xl relative overflow-hidden flex-col justify-between shrink-0 h-fit sticky top-24 border border-white/10">
          <div className="absolute inset-0 opacity-5 pointer-events-none">
            <div className="absolute top-10 left-5 w-20 h-20 rounded-full border border-white" />
            <div className="absolute bottom-10 right-5 w-32 h-32 rounded-full border border-white" />
          </div>

          <div className="relative z-10">
            <span className="text-[10px] font-bold text-aqua uppercase tracking-widest block mb-1">Navigation System</span>
            <h2 className="font-serif font-black text-xl tracking-tight mb-6">Descent Depth</h2>

            <div className="relative pl-6 flex flex-col gap-8 border-l-2 border-slate-700/50">
              <div 
                className="absolute -left-1.5 transition-all duration-500 ease-out flex items-center justify-center w-3 h-3 rounded-full bg-cyan ring-4 ring-cyan/40"
                style={{
                  top: {
                    0: "6px",
                    5: "62px",
                    15: "118px",
                    25: "174px",
                    40: "230px"
                  }[depth]
                }}
              />

              {[
                { val: 0, label: "0m Landing", sub: "Portal Overview" },
                { val: 5, label: "5m Intake", sub: "Site & Emergency" },
                { val: 15, label: "15m Profile", sub: "Badges & Messaging" },
                { val: 25, label: "25m Campaigns", sub: "Opportunities & Tasks" },
                { val: 40, label: "40m Impact", sub: "Conservation Stats" }
              ].map((lvl) => (
                <button
                  key={lvl.val}
                  onClick={() => setDepth(lvl.val)}
                  className={`text-left focus:outline-none transition-all cursor-pointer group min-h-[44px] ${
                    depth === lvl.val ? "text-cyan font-bold scale-102" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <span className="text-xs block leading-none font-bold tracking-wide uppercase">{lvl.label}</span>
                  <span className="text-[10px] text-slate-500 group-hover:text-slate-300 transition block mt-0.5">{lvl.sub}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-700/50 mt-8 pt-4 text-center relative z-10">
            <div className="text-xs text-aqua/90 flex items-center justify-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Depth Status: Calibrated</span>
            </div>
          </div>
        </aside>

        {/* MOBILE BOTTOM DEPTH TAB BAR */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#023E8A] border-t border-white/10 z-50 px-4 py-2 flex justify-between items-center overflow-x-auto gap-2">
          {[
            { val: 0, label: "0m Landing", icon: Waves },
            { val: 5, label: "5m Intake", icon: User },
            { val: 15, label: "15m Profile", icon: MessageSquare },
            { val: 25, label: "25m Campaigns", icon: Calendar },
            { val: 40, label: "40m Impact", icon: BarChart3 }
          ].map((lvl) => {
            const Icon = lvl.icon;
            const isActive = depth === lvl.val;
            return (
              <button
                key={lvl.val}
                onClick={() => setDepth(lvl.val)}
                className="flex flex-col items-center justify-center flex-1 min-w-[56px] py-2 cursor-pointer transition-all min-h-[44px]"
                style={{ color: isActive ? "#62B6CB" : "#94A3B8" }}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[9px] font-bold mt-1 whitespace-nowrap">{lvl.label.split(" ")[0]}</span>
              </button>
            );
          })}
        </div>

        {/* ACTIVE PORTAL CONTENT */}
        <main className="flex-1 min-w-0">
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
                key={depth}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col gap-6"
              >
                
                {/* --- 0m LANDING PAGE VIEW --- */}
                {depth === 0 && (
                  <div className="flex flex-col gap-6">
                    {/* Greeting banner */}
                    <div className="bg-[#023E8A]/90 backdrop-blur-md border border-white/20 text-white rounded-xl p-8 shadow-lg relative overflow-hidden">
                      <div className="max-w-md relative z-10">
                        <span className="px-2.5 py-0.5 rounded-full bg-cyan/20 text-aqua border border-aqua/30 text-[10px] font-bold uppercase tracking-wider">
                          Dive Base Clearance: Active
                        </span>
                        <h1 className="font-serif font-black text-3xl mt-4 leading-tight">
                          Welcome back, <br />
                          {user?.full_name}
                        </h1>
                        <p className="text-slate-200 text-xs mt-3 leading-relaxed">
                          You are assigned to Coordinator <span className="font-bold text-white">{coordinatorName}</span>. Your baseline site preference is listed as <span className="font-bold text-white">{volDetail?.site_name || "Unset"}</span>.
                        </p>
                        <button
                          onClick={() => setDepth(25)}
                          className="mt-6 px-4 py-3 bg-cyan text-white rounded-xl text-xs font-semibold hover:bg-sky-500 transition inline-flex items-center gap-1.5 cursor-pointer min-h-[44px]"
                        >
                          Explore active opportunities
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Coordinator Orientation Note */}
                      <Card title="Coordinator Orientation Note" subtitle="Direct briefing from your assigned lead" glass="light">
                        <div className="flex items-start gap-4">
                          <Avatar name={coordinatorName} size="md" />
                          <div>
                            <h4 className="font-bold text-sm text-[#023E8A]">{coordinatorName}</h4>
                            <p className="text-xs text-slate-500">Regional Outreach Coordinator</p>
                            <p className="text-xs text-[#1B4965] italic mt-3 leading-relaxed border-l-2 border-[#0096C7] pl-3">
                              "Hello! Thank you for stepping up for Ocean School India. Our active targets this week focus on coastal conservation, sapling tag surveys, and local ecosystem monitoring. Check out the campaigns below!"
                            </p>
                          </div>
                        </div>
                      </Card>

                      {/* Pending tasks quick view */}
                      <Card title="Outstanding Action Items" subtitle="Direct items to review this week" glass="light">
                        {myTasks.filter(t => t.status !== "done").length === 0 ? (
                           <div className="p-6 text-center text-[#1B4965]">
                            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                            <h4 className="font-semibold text-sm">No pending tasks!</h4>
                            <p className="text-xs mt-1 text-slate-500">Your schedule is clear. Check the Opportunity Board at 25m Descent to sign up for new campaigns.</p>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-3">
                            {myTasks.filter(t => t.status !== "done").slice(0, 3).map((task) => (
                              <div key={task.id} className="p-3.5 rounded-xl bg-white/40 border border-white/50 flex justify-between items-center gap-4 text-[#1B4965]">
                                <div>
                                  <span className="text-xs font-semibold text-[#023E8A] block">{task.title}</span>
                                  <span className="text-[10px] text-slate-500 mt-0.5 block font-mono">Due: {task.due_date}</span>
                                </div>
                                <button
                                  onClick={() => handleToggleTask(task.id, task.status)}
                                  className="px-4 py-2 bg-[#023E8A] hover:bg-[#1B4965] text-white text-[10px] font-bold cursor-pointer rounded-xl min-h-[44px]"
                                >
                                  Mark Done
                                </button>
                              </div>
                            ))}
                            {myTasks.filter(t => t.status !== "done").length > 3 && (
                              <button onClick={() => setDepth(25)} className="text-xs font-bold text-[#0096C7] hover:underline text-center mt-2 block min-h-[44px]">
                                View all +{myTasks.filter(t => t.status !== "done").length - 3} tasks
                              </button>
                            )}
                          </div>
                        )}
                      </Card>
                    </div>
                  </div>
                )}

                {/* --- 5m INTAKE SURVEY VIEW --- */}
                {depth === 5 && (
                  <Card title="Intake Records & Site Verification" subtitle="Ensure your active site preferences and contacts are verified" glass="light">
                    {isEditingIntake ? (
                      <form onSubmit={handleUpdateIntake} className="flex flex-col gap-5">
                        <Select
                          label="Site Preference *"
                          value={editSitePref}
                          onChange={(e) => setEditSitePref(e.target.value)}
                          error={editSitePrefError}
                          options={sites.map(s => ({ value: s.id, label: `${s.name} (${s.category})` }))}
                        />

                        <Input
                          label="Emergency Contact Information *"
                          placeholder="e.g. Ramesh (Brother) - 9876543210"
                          value={editEmergencyContact}
                          onChange={(e) => setEditEmergencyContact(e.target.value)}
                          error={editEmergencyContactError}
                          className="py-3"
                          required
                        />

                        <div className="flex gap-3 justify-end mt-2">
                          <Button type="button" variant="ghost" onClick={() => setIsEditingIntake(false)} className="py-3 px-4 min-h-[44px]">
                            Cancel
                          </Button>
                          <Button type="submit" className="py-3 px-4 min-h-[44px]">
                            Save Preferences
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex flex-col gap-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-white/45 backdrop-blur-xs p-6 rounded-xl border border-white/60">
                          <div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Intake Code ID</span>
                            <span className="font-mono text-sm font-bold text-[#023E8A] mt-1 block">{volDetail?.volunteer_code}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Preferred Site Sector</span>
                            <span className="text-sm font-bold text-[#023E8A] mt-1 block">{volDetail?.site_name || "Unspecified"}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Time Commitment Profile</span>
                            <span className="text-sm font-bold text-[#023E8A] mt-1 block">{volDetail?.availability || "General Support"}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Intake Source</span>
                            <span className="text-sm font-bold text-[#023E8A] mt-1 block">{volDetail?.how_heard || "Direct Referral"}</span>
                          </div>
                          <div className="sm:col-span-2 border-t border-slate-200/50 pt-4">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Emergency Contact</span>
                            <span className="text-sm font-bold text-[#023E8A] mt-1 block">
                              {volDetail?.emergency_contact ? (
                                volDetail.emergency_contact
                              ) : (
                                <span className="text-coral text-xs font-semibold flex items-center gap-1">
                                  <AlertCircle className="w-4 h-4 shrink-0" />
                                  No emergency contact listed. Please add immediately.
                                </span>
                              )}
                            </span>
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <Button variant="secondary" onClick={() => setIsEditingIntake(true)} className="py-3 px-4 min-h-[44px]">
                            Edit intake parameters
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>
                )}

                {/* --- 15m PROFILE, BADGES & MESSAGING VIEW --- */}
                {depth === 15 && (
                  <div className="flex flex-col gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <Card title="Volunteer Details" subtitle="My core system profile" className="md:col-span-1" glass="dark">
                        <div className="flex flex-col items-center text-center">
                          <Avatar name={user?.full_name || ""} size="lg" className="mb-4" />
                          <h3 className="font-serif font-black text-white text-lg">{user?.full_name}</h3>
                          <p className="text-xs text-slate-300 font-mono mt-0.5">{volDetail?.volunteer_code}</p>

                          <div className="w-full border-t border-white/10 mt-4 pt-4 flex flex-col gap-2 text-left text-xs">
                            <div>
                              <span className="text-slate-300 block uppercase tracking-wider text-[9px] font-bold">Email Address</span>
                              <span className="font-medium text-white">{user?.email}</span>
                            </div>
                            <div>
                              <span className="text-slate-300 block uppercase tracking-wider text-[9px] font-bold">Phone Connection</span>
                              <span className="font-medium text-white">{user?.phone || "No phone linked"}</span>
                            </div>
                          </div>
                        </div>
                      </Card>

                      <Card title="Earned Badges & Activity Tags" subtitle="Based on active logged hours and research preferences" className="md:col-span-2" glass="dark">
                        <div className="flex flex-wrap gap-2.5 mb-6">
                          {volDetail?.interests && volDetail.interests.length > 0 ? (
                            volDetail.interests.map((tag, idx) => (
                              <span key={idx} className="px-2.5 py-1.5 rounded-xl bg-white/10 text-white border border-white/10 text-xs font-semibold">
                                #{tag}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-300 text-xs italic">No interest tags declared.</span>
                          )}
                        </div>

                        <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Field Badges</h4>
                        {activeBadges.length === 0 ? (
                          <p className="text-xs text-slate-300 italic">No badges earned yet. Complete opportunities to earn badges!</p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {activeBadges.map((badge, idx) => (
                              <div key={idx} className="p-3.5 rounded-xl border border-white/10 bg-white/5 flex items-start gap-3">
                                <Award className="w-8 h-8 text-aqua shrink-0" />
                                <div>
                                  <h5 className="font-bold text-xs text-white">{badge.title}</h5>
                                  <p className="text-[10px] text-slate-300 mt-0.5 leading-relaxed">{badge.desc}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </Card>
                    </div>

                    {/* NEW JOIN UNIT & TEAM SECTION */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      
                      {/* Coordinator & Unit Team */}
                      <Card title="My Active Field Unit" subtitle="Collaboration team in your regional sector" className="md:col-span-2" glass="dark">
                        {volDetail?.coordinator_id ? (
                          <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-3.5 bg-white/5 p-4 rounded-xl border border-white/10">
                              <Avatar name={coordinatorName} size="md" />
                              <div>
                                <h4 className="text-sm font-bold text-white">{coordinatorName}</h4>
                                <p className="text-xs text-slate-300">Your assigned Staff Coordinator Lead</p>
                              </div>
                            </div>

                            <div className="mt-2">
                              <h5 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Unit Team Members</h5>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {myUnitTeam.map((teamVol, idx) => (
                                  <div key={idx} className="p-3 rounded-lg bg-white/5 border border-white/5 flex justify-between items-center text-xs">
                                    <div className="flex items-center gap-2.5 truncate">
                                      <Avatar name={teamVol.full_name} size="sm" />
                                      <span className="font-semibold text-white truncate">{teamVol.full_name}</span>
                                    </div>
                                    <span className="text-[10px] text-emerald-400 font-mono shrink-0">{teamVol.hours_logged}h</span>
                                  </div>
                                ))}
                                {myUnitTeam.length <= 1 && (
                                  <div className="col-span-full p-4 text-center text-slate-400 italic text-xs">You are currently the only volunteer in this active unit.</div>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="p-6 text-center text-white">
                            <Users className="w-10 h-10 text-cyan mx-auto mb-2" />
                            <h4 className="font-bold text-sm">No Coordinator Unit Assigned</h4>
                            <p className="text-xs text-slate-300 mt-1">
                              You are not currently assigned to any active coordinator unit. Please accept an invite or apply to a team on the right.
                            </p>
                          </div>
                        )}
                      </Card>

                      {/* Invitations & Request to Join */}
                      <Card title="Unit Invitations & Applications" subtitle="Manage your regional coordinator invitations" className="md:col-span-1" glass="dark">
                        <div className="flex flex-col gap-4">
                          
                          {/* Active Invitations from Coordinators */}
                          <div className="flex flex-col gap-2">
                            <h5 className="text-[10px] font-bold text-[#62B6CB] uppercase tracking-wider">Incoming Unit Invitations</h5>
                            {myJoinRequests.filter(r => r.to_id === user!.id && r.status === "pending").map(req => (
                              <div key={req.id} className="p-3 bg-white/10 rounded-lg border border-white/10 text-xs">
                                <p className="font-bold text-white">{req.from_profile?.full_name}</p>
                                <p className="text-[10px] text-slate-300 italic mt-1 font-mono leading-relaxed">"{req.message}"</p>
                                <div className="flex gap-2 mt-3">
                                  <Button onClick={() => handleAcceptInvite(req)} className="text-[10px] py-1.5 px-3 min-h-[34px] bg-[#0096C7]">Accept</Button>
                                  <Button onClick={() => handleDeclineInvite(req)} variant="secondary" className="text-[10px] py-1.5 px-3 min-h-[34px]">Decline</Button>
                                </div>
                              </div>
                            ))}
                            {myJoinRequests.filter(r => r.to_id === user!.id && r.status === "pending").length === 0 && (
                              <p className="text-xs text-slate-400 italic">No incoming invitations.</p>
                            )}
                          </div>

                          {/* Request to join other coordinators */}
                          <div className="border-t border-white/10 pt-3 flex flex-col gap-2">
                            <h5 className="text-[10px] font-bold text-[#62B6CB] uppercase tracking-wider">Request to Join Unit</h5>
                            <div className="max-h-[160px] overflow-y-auto pr-1 flex flex-col gap-2">
                              {coordinatorsList.filter(c => c.id !== volDetail?.coordinator_id).map(coord => {
                                const requestStatus = myJoinRequests.find(r => r.to_id === coord.id && r.from_id === user!.id)?.status;
                                return (
                                  <div key={coord.id} className="p-2.5 bg-white/5 border border-white/5 rounded-lg flex justify-between items-center text-xs">
                                    <span className="font-semibold text-white truncate max-w-[120px]">{coord.full_name}</span>
                                    {requestStatus ? (
                                      <span className="text-[10px] font-mono uppercase font-bold text-cyan">{requestStatus}</span>
                                    ) : (
                                      <button 
                                        onClick={() => handleRequestJoinUnit(coord.id)}
                                        className="text-[10px] font-bold text-[#62B6CB] hover:text-white flex items-center gap-1 cursor-pointer min-h-[34px] p-1.5 rounded hover:bg-white/10"
                                      >
                                        Apply
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                        </div>
                      </Card>

                    </div>

                    <Card title={`Conversation with Coordinator: ${coordinatorName}`} subtitle="Direct secure 1:1 messenger. Check in for instructions." glass="dark">
                      <div className="flex flex-col h-96 border border-white/10 rounded-xl overflow-hidden bg-white/5">
                        <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3">
                          {messages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center p-6">
                              <MessageSquare className="w-10 h-10 text-cyan mb-2" />
                              <h4 className="font-semibold text-sm text-white">No messages yet</h4>
                              <p className="text-xs text-slate-300 mt-0.5">Select a volunteer to start a conversation, or say hello below.</p>
                            </div>
                          ) : (
                            messages.map((msg) => {
                              const isMe = msg.sender_id === user!.id;
                              return (
                                <div
                                  key={msg.id}
                                  className={`max-w-[80%] p-3.5 rounded-xl text-xs leading-relaxed ${
                                    isMe
                                      ? "bg-[#0096C7] text-white rounded-br-none self-end animate-fade-in"
                                      : "bg-white/10 border border-white/10 text-white rounded-bl-none self-start"
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

                        <form onSubmit={handleSendMessage} className="bg-white/5 border-t border-white/10 p-3 flex gap-2.5">
                          <input
                            type="text"
                            placeholder={`Message ${coordinatorName}...`}
                            value={newMessageText}
                            onChange={(e) => setNewMessageText(e.target.value)}
                            className="flex-1 px-4 py-3 text-xs bg-white/10 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan text-white placeholder-slate-400 min-h-[44px]"
                          />
                          <button
                            type="submit"
                            disabled={!newMessageText.trim() || isSendingMessage}
                            className="px-4 py-3 bg-[#0096C7] hover:bg-[#023E8A] disabled:opacity-50 text-white rounded-xl text-xs font-bold shrink-0 transition inline-flex items-center gap-1 cursor-pointer min-h-[44px]"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </form>
                      </div>
                    </Card>
                  </div>
                )}

                {/* --- 25m CAMPAIGNS, OPPORTUNITIES & TASKS --- */}
                {depth === 25 && (
                  <div className="flex flex-col gap-8">
                    <Card title="My Personal Tasks Checklist" subtitle="Track tasks assigned by your coordinator" glass="dark">
                      {myTasks.length === 0 ? (
                        <div className="p-8 text-center bg-white/5 border border-white/10 rounded-xl text-white">
                          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                          <h4 className="font-bold text-sm">No tasks assigned yet!</h4>
                          <p className="text-xs text-slate-300 mt-1">Excellent. You are currently fully up to date with your site-related responsibilities.</p>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3">
                          {myTasks.map((task) => {
                            const isDone = task.status === "done";
                            return (
                              <div
                                key={task.id}
                                className={`p-4 rounded-xl border transition flex items-start gap-4 ${
                                  isDone 
                                    ? "bg-white/5 border-white/5 text-slate-400" 
                                    : "bg-white/10 border border-white/10 hover:border-white/20 text-white"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isDone}
                                  onChange={() => handleToggleTask(task.id, task.status)}
                                  className="w-5 h-5 rounded border-white/20 bg-white/10 text-cyan focus:ring-cyan mt-0.5 cursor-pointer min-h-[44px] min-w-[44px]"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className={`text-sm font-bold leading-tight ${isDone ? "line-through text-slate-400" : "text-white"}`}>
                                      {task.title}
                                    </h4>
                                    <Badge status={task.priority} />
                                  </div>
                                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">{task.description}</p>
                                  
                                  <div className="flex gap-4 mt-2 text-[10px] text-slate-300 font-mono">
                                    <span>DUE: {task.due_date}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </Card>

                    <div className="flex flex-col gap-4">
                      <div className="pb-2 text-white relative">
                        <h2 className="font-serif font-black text-xl">Active Marine Restoration Campaigns</h2>
                        <p className="text-slate-300 text-xs mt-0.5">Explore active drives and volunteer signups.</p>
                        <WaveDivider className="text-white/20 mt-3" />
                      </div>

                      {opportunities.filter(o => o.status !== "cancelled").length === 0 ? (
                        <div className="p-8 text-center bg-white/5 border border-white/10 rounded-xl text-white">
                          <Waves className="w-12 h-12 text-cyan mx-auto mb-3 animate-pulse" />
                          <h4 className="font-bold text-sm">Campaign board is currently still</h4>
                          <p className="text-xs text-slate-300 mt-1">There are no active coastal campaigns or open drives posted at this moment.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {opportunities.filter(o => o.status !== "cancelled").map((opp) => {
                            const isCompleted = opp.status === "completed";
                            return (
                              <div
                                key={opp.id}
                                className={`bg-white/10 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden flex flex-col justify-between hover:shadow-lg transition duration-200 text-white ${
                                  isCompleted ? "opacity-75" : ""
                                }`}
                              >
                                <div className="p-5">
                                  <div className="flex justify-between items-start gap-3">
                                    <Badge status={opp.status} />
                                    <span className="text-[10px] font-mono font-bold text-slate-300 uppercase tracking-wide">
                                      {opp.commitment_label}
                                    </span>
                                  </div>

                                  <h3 className="font-serif font-bold text-base text-white mt-3">
                                    {opp.title}
                                  </h3>
                                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                                    {opp.description}
                                  </p>

                                  <div className="border-t border-white/10 mt-4 pt-3 flex flex-wrap gap-x-4 gap-y-2 text-[10px] text-slate-300 font-mono">
                                    <div>SITE: <span className="font-bold text-white">{opp.site?.name || "Multiple"}</span></div>
                                    <div>DATE: <span className="font-bold text-white">{new Date(opp.date).toLocaleDateString()}</span></div>
                                    <div>CAPACITY: <span className="font-bold text-white">{opp.signup_count}/{opp.capacity}</span></div>
                                  </div>
                                </div>

                                <div className="bg-white/5 px-5 py-3.5 border-t border-white/10 flex justify-end">
                                  {isCompleted ? (
                                    <span className="text-xs font-semibold text-emerald-400 inline-flex items-center gap-1.5">
                                      <CheckCircle2 className="w-4 h-4" />
                                      Campaign Completed
                                    </span>
                                  ) : opp.is_signed_up ? (
                                    <Button variant="ghost" onClick={() => handleCancelSignUp(opp.id)} className="w-full sm:w-auto text-xs py-3 px-4 min-h-[44px] text-white hover:bg-white/10 hover:text-white">
                                      Cancel Signup
                                    </Button>
                                  ) : (
                                    <Button
                                      disabled={opp.signup_count >= opp.capacity}
                                      onClick={() => handleSignUp(opp.id)}
                                      className="w-full sm:w-auto text-xs py-3 px-4 min-h-[44px] bg-[#0096C7] hover:bg-[#023E8A]"
                                    >
                                      {opp.signup_count >= opp.capacity ? "Campaign Full" : "Sign Up"}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* --- 40m IMPACT DASHBOARD VIEW --- */}
                {depth === 40 && (
                  <div className="flex flex-col gap-6">
                    {/* Personal stats strip */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                      <Card title="Hours Credited" subtitle="Approved by coordinator" className="text-center" glass="dark">
                        <span className="font-serif font-black text-4xl text-cyan">{stats.hours}h</span>
                        <p className="text-[10px] text-slate-300 uppercase tracking-widest mt-2 font-semibold">Total logged hours</p>
                      </Card>
                      <Card title="Visits Recorded" subtitle="Dives & baseline sampling drives" className="text-center" glass="dark">
                        <span className="font-serif font-black text-4xl text-cyan">{stats.visits}</span>
                        <p className="text-[10px] text-slate-300 uppercase tracking-widest mt-2 font-semibold">Active site visits</p>
                      </Card>
                      <Card title="Sign-ups Logged" subtitle="Current commitment ledger" className="text-center" glass="dark">
                        <span className="font-serif font-black text-4xl text-cyan">{stats.signups}</span>
                        <p className="text-[10px] text-slate-300 uppercase tracking-widest mt-2 font-semibold">Campaign registrations</p>
                      </Card>
                    </div>

                    {/* Global impact indicators */}
                    <Card title="Ocean School India — Aggregate Impact Indicators" subtitle="Aggregated scientific outcomes logged by active field units" glass="dark">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 text-center py-6">
                        <div className="p-4 rounded-xl bg-[#0096C7]/20 border border-white/10 backdrop-blur-xs">
                          <Waves className="w-8 h-8 text-cyan mx-auto mb-2" />
                          <span className="font-serif font-black text-3xl text-white block">{stats.globalVolunteers}</span>
                          <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider block mt-1">Volunteer Pool</span>
                        </div>

                        <div className="p-4 rounded-xl bg-[#0096C7]/20 border border-white/10 backdrop-blur-xs">
                          <Trash2 className="w-8 h-8 text-coral mx-auto mb-2" />
                          <span className="font-serif font-black text-3xl text-white block">{stats.plasticRemovedKg} kg</span>
                          <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider block mt-1">Plastic Extracted</span>
                        </div>

                        <div className="p-4 rounded-xl bg-[#0096C7]/20 border border-white/10 backdrop-blur-xs">
                          <Award className="w-8 h-8 text-amber mx-auto mb-2" />
                          <span className="font-serif font-black text-3xl text-white block">{stats.saplingsCounted}</span>
                          <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider block mt-1">Saplings Tagged</span>
                        </div>

                        <div className="p-4 rounded-xl bg-[#0096C7]/20 border border-white/10 backdrop-blur-xs">
                          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                          <span className="font-serif font-black text-3xl text-white block">{stats.raftHouseholdsReached}</span>
                          <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider block mt-1">RAFT Contacts</span>
                        </div>
                      </div>

                      <div className="bg-[#62B6CB]/20 p-4 rounded-xl border border-white/10 text-xs text-white leading-relaxed mt-4">
                        <span className="font-bold text-cyan block mb-1">Impact Transparency Policy:</span> In alignment with social work guidelines, all plastic extracted, saplings monitored, and hours credited are verified weekly by assigned coordinators prior to final regional publishing.
                      </div>
                    </Card>
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          )}
        </main>
      </div>
    </div>
  );
}
