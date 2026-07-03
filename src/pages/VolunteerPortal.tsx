import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Waves, Anchor, User, Calendar, CheckSquare, MessageSquare, 
  BarChart3, ShieldAlert, Award, Send, CheckCircle2, Clock, 
  AlertCircle, ArrowRight, UserCheck, Trash2 
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Button, Input, Select, Badge, Card, Avatar, EmptyState } from "../components/UI";
import { VolunteerWithProfile, OpportunityWithSite, Task, Message } from "../types";

export default function VolunteerPortal() {
  const { user, apiFetch, logout } = useAuth();
  const { showToast } = useToast();

  const [depth, setDepth] = useState<number>(0); // 0, 5, 15, 25, 40
  const [loading, setLoading] = useState(true);

  // Data states
  const [volDetail, setVolDetail] = useState<VolunteerWithProfile | null>(null);
  const [opportunities, setOpportunities] = useState<OpportunityWithSite[]>([]);
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
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

  // Edit intake state
  const [isEditingIntake, setIsEditingIntake] = useState(false);
  const [editSitePref, setEditSitePref] = useState("");
  const [editEmergencyContact, setEditEmergencyContact] = useState("");

  const loadAllData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [vols, opps, tasks, msgs, st] = await Promise.all([
        apiFetch("/api/volunteers"),
        apiFetch("/api/opportunities"),
        apiFetch("/api/tasks"),
        apiFetch("/api/messages"),
        apiFetch("/api/stats")
      ]);

      // My volunteer record
      const myRecord = vols.find((v: any) => v.profile_id === user.id);
      if (myRecord) {
        setVolDetail(myRecord);
        setEditSitePref(myRecord.site_preference);
        setEditEmergencyContact(myRecord.emergency_contact || "");
      }

      setOpportunities(opps);
      setMyTasks(tasks);
      setMessages(msgs);
      setStats(st);
    } catch (err: any) {
      showToast(err.message || "Failed to synchronise portal parameters", "error");
    } finally {
      setLoading(false);
    }
  }, [user, apiFetch, showToast]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Update Task Status
  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "done" ? "todo" : "done";
    try {
      await apiFetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        body: JSON.stringify({ status: nextStatus })
      });
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
    try {
      await apiFetch(`/api/opportunities/${oppId}/signup`, {
        method: "POST"
      });
      showToast("Signed up successfully! Checking commitment requirements.", "success");
      loadAllData();
    } catch (err: any) {
      showToast(err.message || "Failed to register for opportunity", "error");
    }
  };

  // Cancel Signup
  const handleCancelSignUp = async (oppId: string) => {
    try {
      await apiFetch(`/api/opportunities/${oppId}/cancel-signup`, {
        method: "POST"
      });
      showToast("Your registration has been cancelled.", "warning");
      loadAllData();
    } catch (err: any) {
      showToast(err.message || "Failed to cancel signup", "error");
    }
  };

  // Submit Intake Form (5m)
  const handleUpdateIntake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!volDetail) return;
    try {
      await apiFetch(`/api/volunteers/${user!.id}`, {
        method: "PUT",
        body: JSON.stringify({
          site_preference: editSitePref,
          emergency_contact: editEmergencyContact
        })
      });
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
    if (!newMessageText.trim() || !volDetail) return;

    try {
      await apiFetch("/api/messages", {
        method: "POST",
        body: JSON.stringify({
          recipient_id: volDetail.coordinator_id,
          body: newMessageText
        })
      });
      setNewMessageText("");
      showToast("Message sent to coordinator", "success");
      loadAllData();
    } catch (err: any) {
      showToast(err.message || "Message transmission failed", "error");
    }
  };

  // Determine badges based on hours and preferred site
  const getBadges = () => {
    if (!volDetail) return [];
    const list = [];
    if (volDetail.hours_logged >= 10) {
      list.push({ title: "Mangrove Guardian", desc: "Logged 10+ conservation hours", color: "bg-emerald-100 text-emerald-800" });
    }
    if (volDetail.site_preference.includes("Dive")) {
      list.push({ title: "Reef Explorer", desc: "Active deep dive survey participant", color: "bg-sky-100 text-sky-800" });
    } else {
      list.push({ title: "Wetland Sentry", desc: "Committed to Navi Mumbai lakes & creeks", color: "bg-blue-100 text-blue-800" });
    }
    if (stats.visits >= 1) {
      list.push({ title: "Field Alum", desc: "Completed at least 1 baseline survey", color: "bg-amber-100 text-amber-800" });
    }
    return list;
  };

  const activeBadges = getBadges();

  if (loading && !volDetail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Waves className="w-10 h-10 text-cyan animate-spin mx-auto mb-4" />
          <p className="font-serif font-bold text-deep text-lg">Synchronizing Depth Gauges...</p>
          <p className="text-xs text-slate-400 mt-1">Calibrating RLS and loading volunteer parameters.</p>
        </div>
      </div>
    );
  }

  // Coordinator Details Helper
  const coordinatorName = volDetail?.coordinator_name || "Neha Kulkarni";

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2.5">
          <Waves className="w-7 h-7 text-cyan animate-pulse" />
          <div>
            <span className="font-serif font-black text-deep text-base tracking-tight block leading-none">OCEAN SCHOOL INDIA</span>
            <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest block leading-none mt-0.5">Volunteer Bank</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-right hidden sm:block">
            <span className="text-xs font-bold text-deep block leading-none">{user?.full_name}</span>
            <span className="text-[10px] font-mono text-cyan font-bold tracking-wider">{volDetail?.volunteer_code}</span>
          </div>
          <Button variant="ghost" onClick={logout} className="text-xs font-semibold py-1.5 px-3">
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main Grid: Depth Gauge + Content */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col lg:flex-row gap-8">
        
        {/* DEPTH GAUGE CONTROLLER */}
        <aside className="lg:w-64 bg-deep text-white rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between shrink-0 h-fit lg:sticky lg:top-24">
          {/* Wave bubbles overlay */}
          <div className="absolute inset-0 opacity-5 pointer-events-none">
            <div className="absolute top-10 left-5 w-20 h-20 rounded-full border border-white" />
            <div className="absolute bottom-10 right-5 w-32 h-32 rounded-full border border-white" />
          </div>

          <div className="relative z-10">
            <span className="text-[10px] font-bold text-aqua uppercase tracking-widest block mb-1">Navigation System</span>
            <h2 className="font-serif font-black text-xl tracking-tight mb-6">Descent Depth</h2>

            {/* Gauge Track */}
            <div className="relative pl-6 flex flex-col gap-8 border-l-2 border-slate-700/50">
              {/* Pointer submarine */}
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
                  className={`text-left focus:outline-none transition-all cursor-pointer group ${
                    depth === lvl.val ? "text-cyan font-bold scale-102" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <span className="text-xs block leading-none font-bold tracking-wide uppercase">{lvl.label}</span>
                  <span className="text-[10px] text-slate-500 group-hover:text-slate-300 transition block mt-0.5">{lvl.sub}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-700/50 mt-8 pt-4 text-center relative z-10 hidden lg:block">
            <div className="text-xs text-aqua/90 flex items-center justify-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Depth Status: Calibrated</span>
            </div>
          </div>
        </aside>

        {/* ACTIVE PORTAL CONTENT */}
        <main className="flex-1 min-w-0">
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
                  <div className="bg-gradient-to-r from-navy to-deep text-white rounded-2xl p-8 shadow-md relative overflow-hidden">
                    <div className="max-w-md relative z-10">
                      <span className="px-2.5 py-0.5 rounded-full bg-cyan/20 text-aqua border border-aqua/30 text-[10px] font-bold uppercase tracking-wider">
                        Dive Base Clearance: Active
                      </span>
                      <h1 className="font-serif font-black text-3xl mt-4 leading-tight">
                        Welcome back, <br />
                        {user?.full_name}
                      </h1>
                      <p className="text-slate-200 text-xs mt-3 leading-relaxed">
                        You are assigned to Coordinator <span className="font-bold text-white">{coordinatorName}</span>. Your baseline site preference is listed as <span className="font-bold text-white">{volDetail?.site_preference}</span>.
                      </p>
                      <button
                        onClick={() => setDepth(25)}
                        className="mt-6 px-4 py-2 bg-cyan text-white rounded-lg text-xs font-semibold hover:bg-sky-500 transition inline-flex items-center gap-1 cursor-pointer"
                      >
                        Explore active opportunities
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Coordinator Welcome message */}
                    <Card title="Coordinator Orientation Note" subtitle="Direct briefing from your assigned lead">
                      <div className="flex items-start gap-4">
                        <Avatar name={coordinatorName} size="md" />
                        <div>
                          <h4 className="font-bold text-sm text-deep">{coordinatorName}</h4>
                          <p className="text-xs text-slate-400">Regional Outreach Coordinator</p>
                          <p className="text-xs text-slate-600 italic mt-3 leading-relaxed border-l-2 border-aqua/40 pl-3">
                            "Hello! Thank you for stepping up for Ocean School India. Our active targets this week focus on the Vashi Creek wet-waste drive and Palm Beach mangrove tag surveys. Review your 25m Campaigns block for direct tasks."
                          </p>
                        </div>
                      </div>
                    </Card>

                    {/* Pending tasks quick view */}
                    <Card title="Outstanding Action Items" subtitle="Direct items to review this week">
                      {myTasks.filter(t => t.status !== "done").length === 0 ? (
                        <EmptyState 
                          title="No pending tasks!" 
                          description="Your schedule is clear. Check the Opportunity Board at 25m Descent to sign up for new field campaigns."
                        />
                      ) : (
                        <div className="flex flex-col gap-3">
                          {myTasks.filter(t => t.status !== "done").slice(0, 3).map((task) => (
                            <div key={task.id} className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex justify-between items-center gap-4">
                              <div>
                                <span className="text-xs font-semibold text-deep block">{task.title}</span>
                                <span className="text-[10px] text-slate-400 mt-0.5 block">Due: {task.due_date}</span>
                              </div>
                              <button
                                onClick={() => handleToggleTask(task.id, task.status)}
                                className="px-2.5 py-1 rounded bg-navy hover:bg-deep text-white text-[10px] font-bold cursor-pointer"
                              >
                                Mark Done
                              </button>
                            </div>
                          ))}
                          {myTasks.filter(t => t.status !== "done").length > 3 && (
                            <button onClick={() => setDepth(25)} className="text-xs font-bold text-cyan hover:underline text-center mt-2 block">
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
                <Card title="Intake Records & Site Verification" subtitle="Ensure your active site preferences and contacts are verified">
                  {isEditingIntake ? (
                    <form onSubmit={handleUpdateIntake} className="flex flex-col gap-5">
                      <Select
                        label="Site Preference"
                        value={editSitePref}
                        onChange={(e) => setEditSitePref(e.target.value)}
                        options={[
                          { value: "Vashi Creek", label: "Vashi Creek (Creek)" },
                          { value: "Palm Beach Road Mangroves", label: "Palm Beach Road Mangroves (Mangroves)" },
                          { value: "Nerul Lake", label: "Nerul Lake (Lake)" },
                          { value: "Parsik Hills", label: "Parsik Hills (Hills)" },
                          { value: "Karave Lake", label: "Karave Lake (Lake)" },
                          { value: "Kavaratti Dive Center", label: "Kavaratti Dive Center (Lakshadweep)" },
                          { value: "Agatti Dive Center", label: "Agatti Dive Center (Lakshadweep)" }
                        ]}
                      />

                      <Input
                        label="Emergency Contact Information"
                        placeholder="Name (Relationship) - Phone number"
                        value={editEmergencyContact}
                        onChange={(e) => setEditEmergencyContact(e.target.value)}
                        required
                      />

                      <div className="flex gap-3 justify-end mt-2">
                        <Button type="button" variant="ghost" onClick={() => setIsEditingIntake(false)}>
                          Cancel
                        </Button>
                        <Button type="submit">
                          Save Preferences
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex flex-col gap-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-xl border border-slate-100">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Intake Code ID</span>
                          <span className="font-mono text-sm font-bold text-deep mt-1 block">{volDetail?.volunteer_code}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Preferred Site Sector</span>
                          <span className="text-sm font-bold text-deep mt-1 block">{volDetail?.site_preference}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Time Commitment Profile</span>
                          <span className="text-sm font-bold text-deep mt-1 block">{volDetail?.availability}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Intake Source</span>
                          <span className="text-sm font-bold text-deep mt-1 block">{volDetail?.how_heard}</span>
                        </div>
                        <div className="sm:col-span-2 border-t border-slate-200/50 pt-4">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Emergency Contact</span>
                          <span className="text-sm font-bold text-deep mt-1 block">
                            {volDetail?.emergency_contact || <span className="text-coral text-xs font-semibold">⚠️ No emergency contact listed. Please add immediately.</span>}
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Button variant="secondary" onClick={() => setIsEditingIntake(true)}>
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
                  {/* Profile Summary Card */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card title="Volunteer Details" subtitle="My core system profile" className="md:col-span-1">
                      <div className="flex flex-col items-center text-center">
                        <Avatar name={user?.full_name || ""} size="lg" className="mb-4" />
                        <h3 className="font-serif font-black text-deep text-lg">{user?.full_name}</h3>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">{volDetail?.volunteer_code}</p>

                        <div className="w-full border-t border-slate-100 my-4 pt-4 flex flex-col gap-2 text-left text-xs">
                          <div>
                            <span className="text-slate-400 block uppercase tracking-wider text-[9px] font-bold">Email Address</span>
                            <span className="font-medium text-slate-700">{user?.email}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block uppercase tracking-wider text-[9px] font-bold">Phone Connection</span>
                            <span className="font-medium text-slate-700">{user?.phone}</span>
                          </div>
                        </div>
                      </div>
                    </Card>

                    {/* Badges block */}
                    <Card title="Earned Badges & Activity Tags" subtitle="Based on active logged hours and research preferences" className="md:col-span-2">
                      <div className="flex flex-wrap gap-2.5 mb-6">
                        {volDetail?.interests.map((tag, idx) => (
                          <span key={idx} className="px-2.5 py-1 rounded bg-cyan/10 text-cyan text-xs font-semibold">
                            #{tag}
                          </span>
                        ))}
                      </div>

                      <h4 className="text-xs font-bold text-deep uppercase tracking-wider mb-3">Field Badges</h4>
                      {activeBadges.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No badges earned yet. Complete opportunities to earn badges!</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {activeBadges.map((badge, idx) => (
                            <div key={idx} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50 flex items-start gap-3">
                              <Award className="w-8 h-8 text-cyan shrink-0" />
                              <div>
                                <h5 className="font-bold text-xs text-deep">{badge.title}</h5>
                                <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{badge.desc}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>
                  </div>

                  {/* 1:1 Messenger Card */}
                  <Card title={`Conversation with Coordinator: ${coordinatorName}`} subtitle="Direct secure 1:1 messenger. Your conversations are monitored by admins.">
                    <div className="flex flex-col h-96 border border-slate-100 rounded-xl overflow-hidden bg-slate-50">
                      
                      {/* Message Thread Body */}
                      <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3">
                        {messages.length === 0 ? (
                          <div className="h-full flex items-center justify-center text-center">
                            <p className="text-xs text-slate-400 italic">No messages exchanged yet. Send a greeting below!</p>
                          </div>
                        ) : (
                          messages.map((msg) => {
                            const isMe = msg.sender_id === user!.id;
                            return (
                              <div
                                key={msg.id}
                                className={`max-w-[80%] p-3 rounded-xl text-xs leading-relaxed ${
                                  isMe
                                    ? "bg-navy text-white rounded-br-none self-end"
                                    : "bg-white text-slate-800 border border-slate-100 rounded-bl-none self-start"
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

                      {/* Message Input Form */}
                      <form onSubmit={handleSendMessage} className="bg-white border-t border-slate-100 p-3 flex gap-2.5">
                        <input
                          type="text"
                          placeholder={`Message ${coordinatorName}...`}
                          value={newMessageText}
                          onChange={(e) => setNewMessageText(e.target.value)}
                          className="flex-1 px-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan"
                        />
                        <button
                          type="submit"
                          disabled={!newMessageText.trim()}
                          className="px-4 py-2 bg-navy hover:bg-deep disabled:opacity-50 text-white rounded-lg text-xs font-bold shrink-0 transition inline-flex items-center gap-1 cursor-pointer"
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
                  {/* My Tasks Tracker */}
                  <Card title="My Personal Tasks Checklist" subtitle="Track tasks assigned by your coordinator">
                    {myTasks.length === 0 ? (
                      <EmptyState
                        title="No Tasks Assigned!"
                        description="Excellent. You are currently fully up to date with your site-related responsibilities."
                        icon={<CheckCircle2 className="w-8 h-8 text-emerald-500" />}
                      />
                    ) : (
                      <div className="flex flex-col gap-3">
                        {myTasks.map((task) => {
                          const isDone = task.status === "done";
                          return (
                            <div
                              key={task.id}
                              className={`p-4 rounded-xl border transition flex items-start gap-4 ${
                                isDone 
                                  ? "bg-slate-50 border-slate-100 text-slate-400" 
                                  : "bg-white border-slate-100 hover:border-slate-200"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isDone}
                                onChange={() => handleToggleTask(task.id, task.status)}
                                className="w-4 h-4 rounded border-slate-300 text-cyan focus:ring-cyan mt-1 cursor-pointer"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className={`text-sm font-bold leading-tight ${isDone ? "line-through text-slate-400" : "text-deep"}`}>
                                    {task.title}
                                  </h4>
                                  <Badge status={task.priority} />
                                </div>
                                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{task.description}</p>
                                
                                <div className="flex gap-4 mt-2 text-[10px] text-slate-400 font-mono">
                                  <span>DUE: {task.due_date}</span>
                                  {task.opportunity_title && (
                                    <span className="text-cyan">Linked: {task.opportunity_title}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Card>

                  {/* Active campaigns / Opportunities */}
                  <div className="flex flex-col gap-4">
                    <div className="border-b border-slate-100 pb-2">
                      <h2 className="font-serif font-black text-xl text-deep">Active Marine Restoration Campaigns</h2>
                      <p className="text-slate-400 text-xs mt-0.5">Explore active drives and volunteer signups.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {opportunities.filter(o => o.status !== "cancelled").map((opp) => {
                        const isCompleted = opp.status === "completed";
                        return (
                          <div
                            key={opp.id}
                            className={`bg-white rounded-xl border border-slate-100 overflow-hidden flex flex-col justify-between hover:shadow-md transition duration-200 ${
                              isCompleted ? "opacity-75" : ""
                            }`}
                          >
                            <div className="p-5">
                              <div className="flex justify-between items-start gap-3">
                                <Badge status={opp.status} />
                                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wide">
                                  {opp.commitment_label}
                                </span>
                              </div>

                              <h3 className="font-serif font-bold text-base text-deep mt-3">
                                {opp.title}
                              </h3>
                              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                                {opp.description}
                              </p>

                              <div className="border-t border-slate-50 mt-4 pt-3 flex flex-wrap gap-x-4 gap-y-2 text-[10px] text-slate-400 font-mono">
                                <div>SITE: <span className="font-bold text-slate-600">{opp.site?.name || "Multiple"}</span></div>
                                <div>DATE: <span className="font-bold text-slate-600">{opp.date}</span></div>
                                <div>CAPACITY: <span className="font-bold text-slate-600">{opp.signup_count}/{opp.capacity}</span></div>
                              </div>
                            </div>

                            <div className="bg-slate-50 px-5 py-3.5 border-t border-slate-100 flex justify-end">
                              {isCompleted ? (
                                <span className="text-xs font-semibold text-emerald-600 inline-flex items-center gap-1.5">
                                  <CheckCircle2 className="w-4 h-4" />
                                  Campaign Completed
                                </span>
                              ) : opp.is_signed_up ? (
                                <Button variant="secondary" onClick={() => handleCancelSignUp(opp.id)} className="w-full sm:w-auto text-xs py-1.5">
                                  Cancel Signup
                                </Button>
                              ) : (
                                <Button
                                  disabled={opp.signup_count >= opp.capacity}
                                  onClick={() => handleSignUp(opp.id)}
                                  className="w-full sm:w-auto text-xs py-1.5"
                                >
                                  {opp.signup_count >= opp.capacity ? "Campaign Full" : "Sign Up"}
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* --- 40m IMPACT DASHBOARD VIEW --- */}
              {depth === 40 && (
                <div className="flex flex-col gap-6">
                  {/* Personal stats strip */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <Card title="Hours Credited" subtitle="Approved by coordinator" className="text-center">
                      <span className="font-serif font-black text-4xl text-cyan">{stats.hours}h</span>
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-2 font-semibold">Total logged hours</p>
                    </Card>
                    <Card title="Visits Recorded" subtitle="Dives & baseline sampling drives" className="text-center">
                      <span className="font-serif font-black text-4xl text-cyan">{stats.visits}</span>
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-2 font-semibold">Active site visits</p>
                    </Card>
                    <Card title="Sign-ups Logged" subtitle="Current commitment ledger" className="text-center">
                      <span className="font-serif font-black text-4xl text-cyan">{stats.signups}</span>
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-2 font-semibold">Campaign registrations</p>
                    </Card>
                  </div>

                  {/* Global impact indicators */}
                  <Card title="Ocean School India — Aggregate Impact Indicators" subtitle="Aggregated scientific outcomes logged by active field units">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center py-6">
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                        <Waves className="w-8 h-8 text-cyan mx-auto mb-2" />
                        <span className="font-serif font-black text-3xl text-deep block">{stats.globalVolunteers}</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-1">Volunteer Pool</span>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                        <Trash2 className="w-8 h-8 text-coral mx-auto mb-2" />
                        <span className="font-serif font-black text-3xl text-deep block">{stats.plasticRemovedKg} kg</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-1">Plastic Extracted</span>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                        <Award className="w-8 h-8 text-amber mx-auto mb-2" />
                        <span className="font-serif font-black text-3xl text-deep block">{stats.saplingsCounted}</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-1">Saplings Tagged</span>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                        <span className="font-serif font-black text-3xl text-deep block">{stats.raftHouseholdsReached}</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-1">RAFT Contacts</span>
                      </div>
                    </div>

                    <div className="bg-sky-50 p-4 rounded-xl border border-sky-100 text-xs text-sky-800 leading-relaxed mt-4">
                      <span className="font-bold block mb-1">Impact Transparency Policy:</span> In alignment with social work guidelines, all plastic extracted, saplings monitored, and hours credited are verified weekly by assigned coordinators prior to final regional publishing.
                    </div>
                  </Card>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
