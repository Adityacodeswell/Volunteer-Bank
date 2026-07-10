import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Waves, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { Button, Input, Select, Textarea, Chip, Card } from "../components/UI";
import { supabase } from "../supabaseClient";
import { motion } from "motion/react";

const HEAR_OPTIONS = ["Social Media", "A Friend", "Online Search", "Event", "Other"];
const WORK_OPTIONS = [
  "Fieldwork & Surveys",
  "Mangrove Restoration",
  "Cleanup Drives",
  "Content & Media",
  "Research & GIS",
  "Community Outreach",
  "Diving"
];
const AVAILABILITY_OPTIONS = [
  "A day or two a year",
  "Several times a month",
  "Weekend warrior",
  "Three weeks or longer"
];

export default function JoinPage() {
  const navigate = useNavigate();
  const [sites, setSites] = useState<{ id: string; name: string }[]>([]);
  const [loadingSites, setLoadingSites] = useState(true);

  // Form states
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [howHeard, setHowHeard] = useState("");
  const [sitePref, setSitePref] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [availability, setAvailability] = useState("");
  const [message, setMessage] = useState("");

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Field validation
  const [fullNameError, setFullNameError] = useState("");
  const [emailError, setEmailError] = useState("");

  useEffect(() => {
    async function fetchSites() {
      try {
        const { data, error } = await supabase
          .from("sites")
          .select("id, name")
          .order("name");
        if (error) throw error;
        setSites(data || []);
        if (data && data.length > 0) {
          setSitePref(data[0].id);
        }
      } catch (err) {
        console.error("Failed to load sites", err);
      } finally {
        setLoadingSites(false);
      }
    }
    fetchSites();
  }, []);

  const handleInterestToggle = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
  };

  const validate = () => {
    let isValid = true;
    if (!fullName.trim()) {
      setFullNameError("Full Name is required");
      isValid = false;
    } else {
      setFullNameError("");
    }

    if (!email.trim() || !email.includes("@")) {
      setEmailError("A valid email address is required");
      isValid = false;
    } else {
      setEmailError("");
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setError(null);

    try {
      // Find the site name to store as text or store site preference ID/name
      const selectedSiteObj = sites.find((s) => s.id === sitePref);
      const sitePrefName = selectedSiteObj ? selectedSiteObj.name : sitePref;

      const { error: insertErr } = await supabase
        .from("volunteer_applications")
        .insert({
          full_name: fullName.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          site_preference: sitePrefName,
          interests: selectedInterests,
          availability: availability || null,
          how_heard: howHeard || null,
          message: message.trim() || null,
          status: "pending"
        });

      if (insertErr) throw insertErr;

      // Realtime notification for staff of a new application
      try {
        const { data: staffList } = await supabase
          .from("profiles")
          .select("id")
          .eq("role", "staff");

        if (staffList && staffList.length > 0) {
          const notifs = staffList.map((staff) => ({
            user_id: staff.id,
            type: "new_application",
            title: "New Volunteer Application",
            body: `${fullName.trim()} has applied to volunteer.`,
            read: false
          }));
          await supabase.from("notifications").insert(notifs);
        }
      } catch (notifErr) {
        console.error("Non-blocking notification delivery failed", notifErr);
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to submit your application. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 justify-center items-center p-6 selection:bg-cyan/30 font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="max-w-md w-full bg-white border border-slate-100 rounded-2xl shadow-xl p-8 text-center flex flex-col items-center"
        >
          <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="font-serif font-black text-2xl text-deep tracking-tight mb-3">
            Application Received!
          </h2>
          <p className="text-slate-600 text-sm leading-relaxed mb-6">
            Thank you, <span className="font-bold text-deep">{fullName}</span>. Your details have been transmitted to the Ocean School India volunteer bank. A regional coordinator will review your preferences and contact you within 48 hours.
          </p>
          <div className="w-full border-t border-slate-100 pt-6">
            <Button onClick={() => navigate("/")} className="w-full py-3">
              Back to Home
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 selection:bg-cyan/30 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2.5 group">
            <Waves className="w-8 h-8 text-cyan animate-pulse group-hover:scale-105 transition-all" />
            <div>
              <span className="font-serif font-black text-deep text-lg tracking-tight leading-none block">
                OCEAN SCHOOL INDIA
              </span>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest leading-none block mt-0.5">
                Volunteer Bank
              </span>
            </div>
          </Link>
          <Link
            to="/"
            className="text-xs font-semibold text-[#023E8A] hover:text-deep flex items-center gap-1 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </header>

      {/* Main Content Form */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="font-serif font-black text-3xl text-deep tracking-tight mb-2">
            Apply to Volunteer
          </h1>
          <p className="text-slate-500 text-sm mb-8 leading-relaxed">
            Fill out this quick form to register your interest with Ocean School India. Our staff will match you to active conservation campaigns in your area.
          </p>

          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-800 text-xs flex items-start gap-2.5 mb-6">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <Card title="Personal Information" subtitle="Your basic contact details">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Full Name *"
                  id="fullName"
                  placeholder="e.g. Rahul Sharma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  error={fullNameError}
                  required
                />
                <Input
                  label="Email Address *"
                  id="email"
                  type="email"
                  placeholder="e.g. rahul@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={emailError}
                  required
                />
                <div className="sm:col-span-2">
                  <Input
                    label="Phone Number"
                    id="phone"
                    type="tel"
                    placeholder="e.g. +91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>
            </Card>

            <Card title="Interests & Location" subtitle="Tell us where and what you'd like to work on">
              <div className="flex flex-col gap-5">
                <Select
                  label="Which site interests you most? *"
                  id="sitePref"
                  value={sitePref}
                  onChange={(e) => setSitePref(e.target.value)}
                  options={
                    loadingSites
                      ? [{ value: "", label: "Loading active sites..." }]
                      : sites.map((s) => ({ value: s.id, label: s.name }))
                  }
                  disabled={loadingSites}
                />

                <div className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-deep/70">
                    What kind of work interests you?
                  </span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {WORK_OPTIONS.map((opt) => {
                      const isSel = selectedInterests.includes(opt);
                      return (
                        <Chip
                          key={opt}
                          label={opt}
                          isSelected={isSel}
                          onClick={() => handleInterestToggle(opt)}
                        />
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-deep/70">
                    How did you hear about us?
                  </span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {HEAR_OPTIONS.map((opt) => {
                      const isSel = howHeard === opt;
                      return (
                        <Chip
                          key={opt}
                          label={opt}
                          isSelected={isSel}
                          onClick={() => setHowHeard(opt)}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            </Card>

            <Card title="Availability & Statement" subtitle="Your availability profile and motivation">
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-deep/70">
                    Availability Profile
                  </span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {AVAILABILITY_OPTIONS.map((opt) => {
                      const isSel = availability === opt;
                      return (
                        <Chip
                          key={opt}
                          label={opt}
                          isSelected={isSel}
                          onClick={() => setAvailability(opt)}
                        />
                      );
                    })}
                  </div>
                </div>

                <Textarea
                  label="Tell us why you want to volunteer (optional)"
                  id="message"
                  placeholder="e.g. I am passionate about coastal ecosystems and have baseline mapping experience..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                />
              </div>
            </Card>

            <div className="flex justify-end gap-3 items-center">
              <Button type="button" variant="ghost" onClick={() => navigate("/")} className="py-3">
                Cancel
              </Button>
              <Button type="submit" isLoading={submitting} className="py-3 px-6">
                Submit Application
              </Button>
            </div>
          </form>
        </motion.div>
      </main>
    </div>
  );
}
