import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Anchor, ShieldAlert, Waves, Compass, ArrowRight, Award, HelpCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const mumbaistates = [
    {
      name: "Vashi Creek",
      desc: "Estuarine ecosystem under threat. Focused on extensive wet-plastic removal and bio-indicator monitoring.",
      type: "Creek / Lagoon",
      depth: "5m Descent"
    },
    {
      name: "Palm Beach Road Mangroves",
      desc: "Vast tidal mangrove belts. Action items include weekly sapling planting and visual survival density mapping.",
      type: "Mangrove Sanctuary",
      depth: "15m Descent"
    },
    {
      name: "Nerul Lake",
      desc: "Vital urban wetlands. Concentrated around baseline biochemical oxygen demand (BOD) water sampling.",
      type: "Lake / Wetland",
      depth: "5m Descent"
    },
    {
      name: "Parsik Hills",
      desc: "Terrestrial catchment forests buffering the lakes. Focuses on afforestation and soil erosion mitigation.",
      type: "Forest / Catchment",
      depth: "25m Descent"
    },
    {
      name: "Karave Lake",
      desc: "Traditional community fishing reserve. Focused on water quality restoration and shoreline cleanups.",
      type: "Lake / Reserve",
      depth: "15m Descent"
    }
  ];

  const lakshadweepStates = [
    { name: "Kavaratti Dive Center", desc: "Deep-sea monitoring center. quadrant transect coral health mapping.", depth: "40m Descent" },
    { name: "Agatti Dive Center", desc: "Coral nursery expansion depot. checking visual O-rings and dive logs.", depth: "40m Descent" }
  ];

  const handleCTAClick = () => {
    if (user) {
      if (user.role === "admin") navigate("/admin");
      else if (user.role === "staff") navigate("/staff");
      else navigate("/volunteer");
    } else {
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 selection:bg-cyan/30">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <Waves className="w-8 h-8 text-cyan animate-pulse" />
            <div>
              <span className="font-serif font-black text-deep text-lg tracking-tight leading-none block">OCEAN SCHOOL INDIA</span>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest leading-none block mt-0.5">Volunteer Bank</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/join" className="px-4 py-2 text-sm font-semibold text-cyan hover:text-navy transition">
              Apply to Volunteer
            </Link>
            <button
              onClick={handleCTAClick}
              className="px-5 py-2 rounded-lg bg-navy hover:bg-deep text-white font-medium text-sm transition shadow-sm cursor-pointer inline-flex items-center gap-1.5"
            >
              {user ? "Enter Dashboard" : "Volunteer Login"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative bg-gradient-to-b from-blue-50/50 via-white to-slate-50 px-6 py-20 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 opacity-15 pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-cyan filter blur-3xl animate-bounce" style={{ animationDuration: '12s' }} />
          <div className="absolute top-60 -left-20 w-80 h-80 rounded-full bg-aqua filter blur-2xl" />
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <span className="px-3 py-1 rounded-full bg-cyan/10 text-cyan text-xs font-bold uppercase tracking-widest border border-cyan/20">
            Est. 2012 — Marine Research & Action
          </span>
          <h1 className="font-serif font-black text-4xl sm:text-5xl lg:text-6xl text-deep mt-6 tracking-tight leading-[1.1]">
            Protecting Coastal Sanctity, <br />
            <span className="text-cyan font-serif italic font-normal">From Creeks to Coral Reefs</span>
          </h1>
          <p className="text-slate-600 text-base sm:text-lg mt-6 max-w-2xl mx-auto leading-relaxed font-sans">
            Ocean School India stands as a single source of truth for marine conservation efforts. Join our scientific volunteer bank across the mangroves of Navi Mumbai and deep-sea dive reefs of Lakshadweep.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
            <Link
              to="/join"
              className="px-8 py-3.5 rounded-lg bg-cyan hover:bg-sky-500 text-white font-semibold text-sm transition shadow-md hover:shadow-lg cursor-pointer text-center inline-block"
            >
              Apply to Volunteer
            </Link>
            <button
              onClick={handleCTAClick}
              className="px-8 py-3.5 rounded-lg bg-navy hover:bg-deep text-white font-semibold text-sm transition shadow-md hover:shadow-lg cursor-pointer"
            >
              Access Member Portal
            </button>
          </div>
        </div>
      </section>

      {/* Trust & Mission Strip */}
      <section className="bg-deep text-white py-12 px-6 border-y border-navy">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
          <div className="flex items-start gap-4">
            <Award className="w-10 h-10 text-aqua shrink-0" />
            <div>
              <h4 className="font-serif font-bold text-lg leading-tight">Accredited Research</h4>
              <p className="text-slate-300 text-xs mt-1 leading-relaxed">
                Registered under the Certificate of Social Work & Environmental Research. Scientific protocols guide our coastal action logs.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4 border-t border-slate-700/50 pt-6 md:border-t-0 md:pt-0 md:border-x md:px-6 md:border-slate-700/50">
            <Compass className="w-10 h-10 text-aqua shrink-0" />
            <div>
              <h4 className="font-serif font-bold text-lg leading-tight">RAFT Outreach Program</h4>
              <p className="text-slate-300 text-xs mt-1 leading-relaxed">
                Resilience & Action for Fisher households (RAFT). Direct community waste segregation flyers and wet-waste mapping tools.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4 border-t border-slate-700/50 pt-6 md:border-t-0 md:pt-0">
            <Anchor className="w-10 h-10 text-aqua shrink-0" />
            <div>
              <h4 className="font-serif font-bold text-lg leading-tight">Lakshadweep Dive Base</h4>
              <p className="text-slate-300 text-xs mt-1 leading-relaxed">
                Pristine monitoring stations at Kavaratti & Agatti lagoons. Rigorous training, equipment checkups, and coral transects.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Navi Mumbai Sites Section */}
      <section id="sites" className="py-20 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-16">
            <span className="text-xs font-bold text-cyan uppercase tracking-widest">Active Fields</span>
            <h2 className="font-serif font-black text-3xl sm:text-4xl text-deep mt-2 tracking-tight">Navi Mumbai Ecosystems</h2>
            <p className="text-slate-500 text-sm mt-3">
              Urban wetland restoration belts require systematic water sampling, plastic clean-up and planting data loggers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {mumbaistates.map((site, idx) => (
              <div
                key={idx}
                className="bg-white rounded-xl border border-slate-100 shadow-xs hover:shadow-md transition-all duration-300 p-5 flex flex-col justify-between group hover:-translate-y-1"
              >
                <div>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-semibold uppercase">
                    {site.type}
                  </span>
                  <h3 className="font-serif font-bold text-lg text-deep mt-3 group-hover:text-cyan transition">
                    {site.name}
                  </h3>
                  <p className="text-slate-500 text-xs mt-2.5 leading-relaxed">
                    {site.desc}
                  </p>
                </div>
                <div className="border-t border-slate-50 mt-5 pt-3 flex justify-between items-center">
                  <span className="text-[10px] font-mono font-bold text-slate-400">STATUS: MONITORED</span>
                  <span className="text-xs font-semibold text-deep font-serif italic">{site.depth}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Lakshadweep Sites Section */}
      <section className="py-20 px-6 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-4">
            <div>
              <span className="text-xs font-bold text-cyan uppercase tracking-widest">Deep-Sea Science Stations</span>
              <h2 className="font-serif font-black text-3xl text-deep mt-2 tracking-tight">Lakshadweep Archipelago</h2>
            </div>
            <p className="text-slate-500 text-sm max-w-md">
              Coral health mapping campaigns are guided by dive safety coordinators at Agatti and Kavaratti depots.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {lakshadweepStates.map((site, idx) => (
              <div
                key={idx}
                className="bg-slate-50 rounded-xl border border-slate-100 hover:border-aqua/40 p-6 flex flex-col md:flex-row gap-6 transition items-center"
              >
                <div className="w-14 h-14 rounded-full bg-cyan/10 flex items-center justify-center shrink-0">
                  <Anchor className="w-7 h-7 text-cyan" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h3 className="font-serif font-bold text-lg text-deep">{site.name}</h3>
                    <span className="text-xs font-mono font-bold text-cyan">{site.depth}</span>
                  </div>
                  <p className="text-slate-600 text-xs mt-2 leading-relaxed">{site.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Info Block */}
      <section className="py-16 px-6 bg-slate-50 border-t border-slate-100 text-center">
        <div className="max-w-xl mx-auto">
          <HelpCircle className="w-10 h-10 text-cyan mx-auto mb-4" />
          <h3 className="font-serif font-bold text-xl text-deep mb-2">How Does the Volunteer Bank Work?</h3>
          <p className="text-slate-600 text-xs leading-relaxed max-w-md mx-auto mb-6">
            In order to maintain strict data integrity, self-registration is closed. Volunteer accounts are created during our weekly intake orientations by Ocean School coordinators. Once registered, coordinators will hand you a secure login code with temporary credentials.
          </p>
          <button
            onClick={handleCTAClick}
            className="text-xs font-bold text-navy hover:text-cyan tracking-wider uppercase inline-flex items-center gap-1 cursor-pointer"
          >
            Go to Console Login <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-deep text-white/80 py-8 px-6 border-t border-slate-800 text-center text-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-left">
            <span className="font-serif font-bold block text-white">Ocean School India</span>
            <span className="text-[10px] text-slate-400">Certificate of Social Work & Environmental Action No. RA-88442</span>
          </div>
          <p className="text-slate-400">
            &copy; 2026 Ocean School India Volunteer Bank. All rights reserved. Registered Marine Restoration Trust.
          </p>
        </div>
      </footer>
    </div>
  );
}
