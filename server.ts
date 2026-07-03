import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { 
  Profile, 
  StaffDetails, 
  Volunteer, 
  Site, 
  Opportunity, 
  OpportunitySignup, 
  Task, 
  Message, 
  ActivityLog,
  UserRole
} from "./src/types";

// Extend Express Request interface to hold authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: Profile;
    }
  }
}


const PORT = 3000;
const DB_FILE = path.join(process.cwd(), "db.json");

interface DB {
  profiles: Profile[];
  staff_details: StaffDetails[];
  volunteers: Volunteer[];
  sites: Site[];
  opportunities: Opportunity[];
  opportunity_signups: OpportunitySignup[];
  tasks: Task[];
  messages: Message[];
  activity_log: ActivityLog[];
}

// Helper to load DB
function readDB(): DB {
  if (!fs.existsSync(DB_FILE)) {
    const initialDB = generateSeedData();
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDB, null, 2), "utf8");
    return initialDB;
  }
  try {
    const data = fs.readFileSync(DB_FILE, "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading database file, regenerating...", err);
    const initialDB = generateSeedData();
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDB, null, 2), "utf8");
    return initialDB;
  }
}

// Helper to write DB
function writeDB(db: DB) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf8");
}

// Helper to generate Seed Data
function generateSeedData(): DB {
  const now = new Date().toISOString();
  
  const profiles: Profile[] = [
    {
      id: "user-admin",
      role: "admin",
      full_name: "Dr. Sandeep Patra",
      email: "admin@oceanschool.org",
      phone: "+91 98200 12345",
      created_at: now
    },
    {
      id: "user-neha",
      role: "staff",
      full_name: "Neha Kulkarni",
      email: "neha@oceanschool.org",
      phone: "+91 98201 54321",
      created_at: now
    },
    {
      id: "user-amit",
      role: "staff",
      full_name: "Amit Rao",
      email: "amit@oceanschool.org",
      phone: "+91 98302 98765",
      created_at: now
    },
    {
      id: "user-sneha",
      role: "volunteer",
      full_name: "Sneha Patel",
      email: "sneha.patel@gmail.com",
      phone: "+91 91673 88442",
      created_at: now
    },
    {
      id: "user-rahul",
      role: "volunteer",
      full_name: "Rahul Sharma",
      email: "sharma.rahul99@gmail.com",
      phone: "+91 99302 11223",
      created_at: now
    },
    {
      id: "user-ananya",
      role: "volunteer",
      full_name: "Ananya Rao",
      email: "ananya.sea@gmail.com",
      phone: "+91 90224 88776",
      created_at: now
    },
    {
      id: "user-kabir",
      role: "volunteer",
      full_name: "Kabir Mehta",
      email: "kabir.m@yahoo.com",
      phone: "+91 98112 33445",
      created_at: now
    }
  ];

  const staff_details: StaffDetails[] = [
    {
      profile_id: "user-neha",
      assigned_region: "Navi Mumbai",
      created_by_admin_id: "user-admin"
    },
    {
      profile_id: "user-amit",
      assigned_region: "Lakshadweep",
      created_by_admin_id: "user-admin"
    }
  ];

  const volunteers: Volunteer[] = [
    {
      profile_id: "user-sneha",
      coordinator_id: "user-neha",
      site_preference: "Vashi Creek",
      interests: ["Mangrove Conservation", "Creek Cleanup", "Water Quality"],
      availability: "Weekend warrior",
      how_heard: "Social media",
      status: "active",
      hours_logged: 12,
      volunteer_code: "OSI-VOL-0001",
      created_at: now,
      emergency_contact: "Kiran Patel (Father) - +91 91673 88440"
    },
    {
      profile_id: "user-rahul",
      coordinator_id: "user-neha",
      site_preference: "Nerul Lake",
      interests: ["Water Quality", "Community Outreach"],
      availability: "Several times a month",
      how_heard: "College presentation",
      status: "active",
      hours_logged: 8,
      volunteer_code: "OSI-VOL-0002",
      created_at: now,
      emergency_contact: "Mrs. Sharma (Mother) - +91 99302 11220"
    },
    {
      profile_id: "user-ananya",
      coordinator_id: "user-amit",
      site_preference: "Kavaratti Dive Center",
      interests: ["Scuba Reef Survey", "Plastic Removal", "Field School Alum"],
      availability: "Three weeks or longer",
      how_heard: "Website search",
      status: "active",
      hours_logged: 25,
      volunteer_code: "OSI-VOL-0003",
      created_at: now,
      emergency_contact: "S. Rao (Brother) - +91 90224 88770"
    },
    {
      profile_id: "user-kabir",
      coordinator_id: "user-neha",
      site_preference: "Parsik Hills",
      interests: ["Sapling Count", "Soil Restoration"],
      availability: "A day or two a year",
      how_heard: "Word of mouth",
      status: "pending",
      hours_logged: 0,
      volunteer_code: "OSI-VOL-0004",
      created_at: now,
      emergency_contact: "V. Mehta (Spouse) - +91 98112 33440"
    }
  ];

  const sites: Site[] = [
    { id: "site-vashi", name: "Vashi Creek", depth_label: "5m", category: "Creek" },
    { id: "site-palmbeach", name: "Palm Beach Road Mangroves", depth_label: "15m", category: "Mangroves" },
    { id: "site-nerul", name: "Nerul Lake", depth_label: "5m", category: "Lake" },
    { id: "site-parsik", name: "Parsik Hills", depth_label: "25m", category: "Hills" },
    { id: "site-karave", name: "Karave Lake", depth_label: "15m", category: "Lake" },
    { id: "site-kavaratti", name: "Kavaratti Dive Center", depth_label: "40m", category: "Dive Center" },
    { id: "site-agatti", name: "Agatti Dive Center", depth_label: "40m", category: "Dive Center" }
  ];

  const opportunities: Opportunity[] = [
    {
      id: "opp-mangrove",
      title: "Mangrove Sapling Count & Density Mapping",
      site_id: "site-palmbeach",
      type: "Mangrove Planting",
      description: "Join the core research team along Palm Beach Road. We will survey the density of newly planted mangrove saplings, verify survivability rates, and geo-tag coordinates. Wear high-traction muddy boots.",
      commitment_label: "4 hours",
      date: "2026-07-05",
      capacity: 15,
      created_by_staff_id: "user-neha",
      status: "open"
    },
    {
      id: "opp-vashiclean",
      title: "Vashi Creek Wet-Waste Removal",
      site_id: "site-vashi",
      type: "Creek Cleanup",
      description: "Weekly cleanup focusing on extracting embedded plastics and micro-waste nets near the bridge. Safety gloves and boots are provided. Please carry personal water bottles.",
      commitment_label: "3 hours",
      date: "2026-07-12",
      capacity: 20,
      created_by_staff_id: "user-neha",
      status: "open"
    },
    {
      id: "opp-kavarattireef",
      title: "Kavaratti Coral Reef Health Assessment Dive",
      site_id: "site-kavaratti",
      type: "Reef Survey",
      description: "Dive monitoring at Kavaratti. We will lay quadrant transect lines at 18 meters depth to inspect for coral bleaching indicators. Highly experienced divers with Advanced Open Water (AOW) or above only.",
      commitment_label: "1 day",
      date: "2026-07-18",
      capacity: 6,
      created_by_staff_id: "user-amit",
      status: "open"
    },
    {
      id: "opp-nerulwater",
      title: "Nerul Lake Baseline Sampling Drive",
      site_id: "site-nerul",
      type: "Water Sampling",
      description: "Baseline pollution mapping of Nerul Lake. Sampling water across three pre-determined inlets. No dive required, shore-based testing kit operations.",
      commitment_label: "2 hours",
      date: "2026-06-25",
      capacity: 10,
      created_by_staff_id: "user-neha",
      status: "completed"
    }
  ];

  const opportunity_signups: OpportunitySignup[] = [
    { opportunity_id: "opp-nerulwater", volunteer_id: "user-sneha", signed_up_at: now, attended: true },
    { opportunity_id: "opp-nerulwater", volunteer_id: "user-rahul", signed_up_at: now, attended: true },
    { opportunity_id: "opp-vashiclean", volunteer_id: "user-sneha", signed_up_at: now, attended: false },
    { opportunity_id: "opp-vashiclean", volunteer_id: "user-rahul", signed_up_at: now, attended: false },
    { opportunity_id: "opp-mangrove", volunteer_id: "user-sneha", signed_up_at: now, attended: false },
    { opportunity_id: "opp-mangrove", volunteer_id: "user-kabir", signed_up_at: now, attended: false },
    { opportunity_id: "opp-kavarattireef", volunteer_id: "user-ananya", signed_up_at: now, attended: false }
  ];

  const tasks: Task[] = [
    {
      id: "task-1",
      title: "Deliver Nerul Lake samples to lab",
      description: "Deliver water sample bottles collected on June 25th to the local environmental testing laboratory at Vashi Sector 17.",
      assigned_to_volunteer_id: "user-sneha",
      assigned_by_staff_id: "user-neha",
      due_date: "2026-07-02",
      priority: "medium",
      status: "done",
      linked_opportunity_id: "opp-nerulwater"
    },
    {
      id: "task-2",
      title: "Bring site safety gloves box",
      description: "Collect the large box of orange protective gloves and biohazard waste bags from the Vashi outreach office and bring them to the Vashi Creek site.",
      assigned_to_volunteer_id: "user-sneha",
      assigned_by_staff_id: "user-neha",
      due_date: "2026-07-12",
      priority: "high",
      status: "todo",
      linked_opportunity_id: "opp-vashiclean"
    },
    {
      id: "task-3",
      title: "Verify oxygen tank pressure profiles",
      description: "Log cylinder pressures at the Agatti depot and double check visual O-ring status prior to boarding the boat.",
      assigned_to_volunteer_id: "user-ananya",
      assigned_by_staff_id: "user-amit",
      due_date: "2026-07-17",
      priority: "high",
      status: "in_progress",
      linked_opportunity_id: "opp-kavarattireef"
    },
    {
      id: "task-4",
      title: "Draft RAFT awareness flyers",
      description: "Draft 1-page flyers in Hindi/Marathi on simple trash segregation. Send a PDF proof to Neha before printing.",
      assigned_to_volunteer_id: "user-rahul",
      assigned_by_staff_id: "user-neha",
      due_date: "2026-07-08",
      priority: "low",
      status: "todo",
      linked_opportunity_id: null
    }
  ];

  const messages: Message[] = [
    {
      id: "msg-1",
      thread_id: "user-neha_user-sneha",
      sender_id: "user-neha",
      recipient_id: "user-sneha",
      body: "Welcome to Ocean School India, Sneha! We're thrilled to have you assigned to the Vashi zone. Let's make a big impact on the creeks together.",
      sent_at: "2026-06-20T10:00:00.000Z",
      read: true
    },
    {
      id: "msg-2",
      thread_id: "user-neha_user-sneha",
      sender_id: "user-sneha",
      recipient_id: "user-neha",
      body: "Hi Neha, thank you so much! It was a great experience attending the orientation. I'm ready for the upcoming creek wet-waste removal.",
      sent_at: "2026-06-20T10:15:00.000Z",
      read: true
    },
    {
      id: "msg-3",
      thread_id: "user-neha_user-sneha",
      sender_id: "user-neha",
      recipient_id: "user-sneha",
      body: "Wonderful. Don't forget that we have water sampling on June 25th as well. I've logged a task for you to help deliver those bottles.",
      sent_at: "2026-06-24T09:00:00.000Z",
      read: true
    },
    {
      id: "msg-4",
      thread_id: "user-amit_user-ananya",
      sender_id: "user-amit",
      recipient_id: "user-ananya",
      body: "Hi Ananya, please verify your Open Water Advanced diver logbook is uploaded or shared with the dive depot team before the Kavaratti dive survey.",
      sent_at: "2026-06-21T11:00:00.000Z",
      read: true
    },
    {
      id: "msg-5",
      thread_id: "user-amit_user-ananya",
      sender_id: "user-ananya",
      recipient_id: "user-amit",
      body: "Hi Amit, all checked and sent! I verified my 52 logged dives with the depot master yesterday. We're good to go.",
      sent_at: "2026-06-21T14:30:00.000Z",
      read: false
    }
  ];

  const activity_log: ActivityLog[] = [
    {
      id: "log-1",
      profile_id: "user-admin",
      action_type: "STAFF_CREATED",
      description: "Created coordinator account for Neha Kulkarni",
      created_at: "2026-06-18T09:00:00.000Z"
    },
    {
      id: "log-2",
      profile_id: "user-admin",
      action_type: "STAFF_CREATED",
      description: "Created coordinator account for Amit Rao",
      created_at: "2026-06-18T09:15:00.000Z"
    },
    {
      id: "log-3",
      profile_id: "user-neha",
      action_type: "VOLUNTEER_CREATED",
      description: "Registered new volunteer Sneha Patel (OSI-VOL-0001)",
      created_at: "2026-06-20T09:30:00.000Z"
    },
    {
      id: "log-4",
      profile_id: "user-neha",
      action_type: "OPPORTUNITY_CREATED",
      description: "Created water sampling drive: Nerul Lake Baseline Sampling Drive",
      created_at: "2026-06-22T11:45:00.000Z"
    },
    {
      id: "log-5",
      profile_id: "user-neha",
      action_type: "VOLUNTEER_ATTENDED",
      description: "Marked Sneha Patel and Rahul Sharma as attended for 'Nerul Lake Baseline Sampling Drive'. logged volunteer hours.",
      created_at: "2026-06-25T17:00:00.000Z"
    }
  ];

  return {
    profiles,
    staff_details,
    volunteers,
    sites,
    opportunities,
    opportunity_signups,
    tasks,
    messages,
    activity_log
  };
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Simple static auth map for temp passwords in mock
  // In a real system we'd hash passwords; since it's an applet, direct key checking or a local credentials storage is perfect
  const passwordMap: Record<string, string> = {
    "admin@oceanschool.org": "admin123",
    "neha@oceanschool.org": "staff123",
    "amit@oceanschool.org": "staff123",
    "sneha.patel@gmail.com": "vol123",
    "sharma.rahul99@gmail.com": "vol123",
    "ananya.sea@gmail.com": "vol123",
    "kabir.m@yahoo.com": "vol123",
  };

  // Helper middleware to check mock authentication
  function authenticate(req: express.Request, res: express.Response, next: express.NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(411).json({ error: "Missing or invalid authorization header" });
    }
    const token = authHeader.split(" ")[1];
    const db = readDB();
    const profile = db.profiles.find(p => p.id === token);
    
    if (!profile) {
      return res.status(401).json({ error: "User profile not found. Invalid token." });
    }
    
    req.user = profile;
    next();
  }

  // API Route: Login
  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const db = readDB();
    const profile = db.profiles.find(p => p.email.toLowerCase() === email.toLowerCase());
    
    if (!profile) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Check password
    const savedPassword = passwordMap[profile.email.toLowerCase()] || "temp123";
    if (savedPassword !== password) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Return the profile and a mock token (simply the user's ID)
    res.json({
      token: profile.id,
      user: profile
    });
  });

  // API Route: Current user profile
  app.get("/api/auth/me", authenticate, (req, res) => {
    res.json({ user: req.user });
  });

  // API Route: Set password (forced on first login)
  app.post("/api/auth/set-password", authenticate, (req, res) => {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: "Password is required" });
    }
    const email = req.user!.email.toLowerCase();
    passwordMap[email] = password;
    
    // Log activity
    const db = readDB();
    db.activity_log.push({
      id: "log-" + Math.random().toString(36).substr(2, 9),
      profile_id: req.user!.id,
      action_type: "PASSWORD_RESET",
      description: `${req.user!.full_name} set a new password on first login.`,
      created_at: new Date().toISOString()
    });
    writeDB(db);

    res.json({ success: true, message: "Password updated successfully" });
  });

  // API Route: Get all sites (available to all roles to browse)
  app.get("/api/sites", authenticate, (req, res) => {
    const db = readDB();
    res.json(db.sites);
  });

  // API Route: Edit sites taxonomy (Admin only)
  app.post("/api/sites", authenticate, (req, res) => {
    if (req.user!.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Admins only." });
    }
    const { name, depth_label, category } = req.body;
    if (!name || !depth_label || !category) {
      return res.status(400).json({ error: "Name, depth label, and category are required" });
    }

    const db = readDB();
    const newSite: Site = {
      id: "site-" + Math.random().toString(36).substr(2, 9),
      name,
      depth_label,
      category
    };
    db.sites.push(newSite);
    
    db.activity_log.push({
      id: "log-" + Math.random().toString(36).substr(2, 9),
      profile_id: req.user!.id,
      action_type: "SITE_CREATED",
      description: `Created site/location: ${name} (${depth_label})`,
      created_at: new Date().toISOString()
    });
    
    writeDB(db);
    res.status(201).json(newSite);
  });

  app.delete("/api/sites/:id", authenticate, (req, res) => {
    if (req.user!.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Admins only." });
    }
    const db = readDB();
    const siteId = req.params.id;
    const site = db.sites.find(s => s.id === siteId);
    if (!site) return res.status(404).json({ error: "Site not found" });

    db.sites = db.sites.filter(s => s.id !== siteId);
    db.activity_log.push({
      id: "log-" + Math.random().toString(36).substr(2, 9),
      profile_id: req.user!.id,
      action_type: "SITE_DELETED",
      description: `Deleted site: ${site.name}`,
      created_at: new Date().toISOString()
    });

    writeDB(db);
    res.json({ success: true });
  });

  // API Route: Get Volunteers (with strict RLS logic)
  app.get("/api/volunteers", authenticate, (req, res) => {
    const db = readDB();
    const user = req.user!;
    let filteredVolunteers: Volunteer[] = [];

    if (user.role === "admin") {
      filteredVolunteers = db.volunteers;
    } else if (user.role === "staff") {
      // Staff can only read/write volunteer rows where coordinator_id = auth.uid()
      filteredVolunteers = db.volunteers.filter(v => v.coordinator_id === user.id);
    } else if (user.role === "volunteer") {
      // Volunteer can only read/write their own volunteers row
      filteredVolunteers = db.volunteers.filter(v => v.profile_id === user.id);
    }

    // Attach profile information
    const volunteersWithProfiles = filteredVolunteers.map(v => {
      const profile = db.profiles.find(p => p.id === v.profile_id);
      const coord = db.profiles.find(p => p.id === v.coordinator_id);
      const site = db.sites.find(s => s.name === v.site_preference);
      return {
        ...v,
        profile,
        coordinator_name: coord ? coord.full_name : "Unassigned",
        site_name: site ? site.name : v.site_preference
      };
    });

    res.json(volunteersWithProfiles);
  });

  // API Route: Get specific volunteer detail (with RLS check)
  app.get("/api/volunteers/:id", authenticate, (req, res) => {
    const db = readDB();
    const user = req.user!;
    const targetId = req.params.id;

    const volunteer = db.volunteers.find(v => v.profile_id === targetId);
    if (!volunteer) {
      return res.status(404).json({ error: "Volunteer not found" });
    }

    // RLS Enforcement
    if (user.role === "staff" && volunteer.coordinator_id !== user.id) {
      return res.status(403).json({ error: "Access denied to this volunteer record" });
    } else if (user.role === "volunteer" && volunteer.profile_id !== user.id) {
      return res.status(403).json({ error: "Access denied to this volunteer record" });
    }

    const profile = db.profiles.find(p => p.id === volunteer.profile_id);
    const coord = db.profiles.find(p => p.id === volunteer.coordinator_id);

    res.json({
      ...volunteer,
      profile,
      coordinator_name: coord ? coord.full_name : "Unassigned"
    });
  });

  // API Route: Create Volunteer (Staff/Admin only)
  // This triggers a custom full-stack Flow matching the Supabase Edge Function:
  // 1. Creates the auth user credentials
  // 2. Generates a unique volunteer_code OSI-VOL-####
  // 3. Inserts volunteer with coordinator_id set to the staff member
  // 4. Returns the temporary credentials to display in "Share credentials" modal
  app.post("/api/volunteers", authenticate, (req, res) => {
    if (req.user!.role !== "staff" && req.user!.role !== "admin") {
      return res.status(403).json({ error: "Only staff or admins can register volunteers" });
    }

    const { full_name, email, phone, site_preference, interests, availability, how_heard, emergency_contact } = req.body;
    if (!full_name || !email || !phone || !site_preference || !availability) {
      return res.status(400).json({ error: "Missing required volunteer profile fields" });
    }

    const db = readDB();

    // Check if user already exists
    if (db.profiles.find(p => p.email.toLowerCase() === email.toLowerCase())) {
      return res.status(400).json({ error: "A volunteer with this email already exists" });
    }

    const newProfileId = "user-" + Math.random().toString(36).substr(2, 9);
    
    // Auto-generate code OSI-VOL-####
    const volCount = db.volunteers.length + 1;
    const volunteer_code = `OSI-VOL-${volCount.toString().padStart(4, "0")}`;

    // Temporary password
    const tempPassword = "OSI-" + Math.random().toString(36).substr(2, 5).toUpperCase();
    passwordMap[email.toLowerCase()] = tempPassword;

    const newProfile: Profile = {
      id: newProfileId,
      role: "volunteer",
      full_name,
      email,
      phone,
      created_at: new Date().toISOString()
    };

    const newVolunteer: Volunteer = {
      profile_id: newProfileId,
      coordinator_id: req.user!.role === "staff" ? req.user!.id : (req.body.coordinator_id || req.user!.id),
      site_preference,
      interests: interests || [],
      availability,
      how_heard: how_heard || "Staff intake",
      status: "pending", // starts as pending until they log in and set password
      hours_logged: 0,
      volunteer_code,
      created_at: new Date().toISOString(),
      emergency_contact
    };

    db.profiles.push(newProfile);
    db.volunteers.push(newVolunteer);

    // Activity Log
    db.activity_log.push({
      id: "log-" + Math.random().toString(36).substr(2, 9),
      profile_id: req.user!.id,
      action_type: "VOLUNTEER_CREATED",
      description: `Registered new volunteer ${full_name} (${volunteer_code})`,
      created_at: new Date().toISOString()
    });

    writeDB(db);

    // Return credentials to show staff
    res.status(201).json({
      volunteer: {
        ...newVolunteer,
        profile: newProfile
      },
      credentials: {
        email,
        password: tempPassword,
        volunteer_code
      }
    });
  });

  // API Route: Update Volunteer status / hours (Staff/Admin/Self)
  app.put("/api/volunteers/:id", authenticate, (req, res) => {
    const db = readDB();
    const user = req.user!;
    const targetId = req.params.id;

    const volunteerIndex = db.volunteers.findIndex(v => v.profile_id === targetId);
    if (volunteerIndex === -1) {
      return res.status(404).json({ error: "Volunteer not found" });
    }

    const volunteer = db.volunteers[volunteerIndex];

    // RLS check
    if (user.role === "staff" && volunteer.coordinator_id !== user.id) {
      return res.status(403).json({ error: "Access denied. This is not your assigned volunteer." });
    } else if (user.role === "volunteer" && volunteer.profile_id !== user.id) {
      return res.status(403).json({ error: "Access denied. You can only update your own profile." });
    }

    // Update allowable fields
    const { status, site_preference, interests, availability, hours_logged, emergency_contact, full_name, phone } = req.body;
    
    if (status) volunteer.status = status;
    if (site_preference) volunteer.site_preference = site_preference;
    if (interests) volunteer.interests = interests;
    if (availability) volunteer.availability = availability;
    if (typeof hours_logged === "number") volunteer.hours_logged = hours_logged;
    if (emergency_contact) volunteer.emergency_contact = emergency_contact;

    // Update corresponding profile fields if authorized
    const profileIndex = db.profiles.findIndex(p => p.id === targetId);
    if (profileIndex !== -1) {
      if (full_name) db.profiles[profileIndex].full_name = full_name;
      if (phone) db.profiles[profileIndex].phone = phone;
    }

    // Log action
    db.activity_log.push({
      id: "log-" + Math.random().toString(36).substr(2, 9),
      profile_id: user.id,
      action_type: "VOLUNTEER_UPDATED",
      description: `Updated volunteer profile details for: ${db.profiles[profileIndex]?.full_name || volunteer.volunteer_code}`,
      created_at: new Date().toISOString()
    });

    writeDB(db);
    res.json({
      ...volunteer,
      profile: db.profiles[profileIndex]
    });
  });

  // API Route: Bulk reassign or deactivate (Admin/Staff only)
  app.post("/api/volunteers/bulk-action", authenticate, (req, res) => {
    if (req.user!.role !== "admin" && req.user!.role !== "staff") {
      return res.status(403).json({ error: "Access denied" });
    }

    const { volunteer_ids, action, coordinator_id, status } = req.body;
    if (!volunteer_ids || !Array.isArray(volunteer_ids)) {
      return res.status(400).json({ error: "volunteer_ids array is required" });
    }

    const db = readDB();
    let count = 0;

    db.volunteers = db.volunteers.map(v => {
      if (volunteer_ids.includes(v.profile_id)) {
        // Staff RLS check
        if (req.user!.role === "staff" && v.coordinator_id !== req.user!.id) {
          return v; // bypass if staff attempts to modify another staff's volunteer
        }
        
        count++;
        if (action === "reassign" && coordinator_id) {
          v.coordinator_id = coordinator_id;
        } else if (action === "deactivate") {
          v.status = "inactive";
        } else if (action === "status" && status) {
          v.status = status;
        }
      }
      return v;
    });

    db.activity_log.push({
      id: "log-" + Math.random().toString(36).substr(2, 9),
      profile_id: req.user!.id,
      action_type: "BULK_ACTION",
      description: `Performed bulk action [${action}] on ${count} volunteers.`,
      created_at: new Date().toISOString()
    });

    writeDB(db);
    res.json({ success: true, count });
  });

  // API Route: Staff list (Admin only)
  app.get("/api/staff", authenticate, (req, res) => {
    if (req.user!.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Admins only." });
    }
    const db = readDB();
    const staffWithDetails = db.profiles
      .filter(p => p.role === "staff")
      .map(p => {
        const details = db.staff_details.find(d => d.profile_id === p.id) || {
          profile_id: p.id,
          assigned_region: "Navi Mumbai",
          created_by_admin_id: "user-admin"
        };
        const volunteer_count = db.volunteers.filter(v => v.coordinator_id === p.id).length;
        return {
          profile: p,
          details,
          volunteer_count
        };
      });
    res.json(staffWithDetails);
  });

  // API Route: Create Staff (Admin only)
  app.post("/api/staff", authenticate, (req, res) => {
    if (req.user!.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Admins only." });
    }
    const { full_name, email, phone, assigned_region } = req.body;
    if (!full_name || !email || !phone) {
      return res.status(400).json({ error: "Full name, email and phone are required" });
    }

    const db = readDB();

    if (db.profiles.find(p => p.email.toLowerCase() === email.toLowerCase())) {
      return res.status(400).json({ error: "A user with this email already exists" });
    }

    const newStaffId = "user-" + Math.random().toString(36).substr(2, 9);
    const tempPassword = "STAFF-" + Math.random().toString(36).substr(2, 5).toUpperCase();
    passwordMap[email.toLowerCase()] = tempPassword;

    const newProfile: Profile = {
      id: newStaffId,
      role: "staff",
      full_name,
      email,
      phone,
      created_at: new Date().toISOString()
    };

    const newDetails: StaffDetails = {
      profile_id: newStaffId,
      assigned_region: assigned_region || "Navi Mumbai",
      created_by_admin_id: req.user!.id
    };

    db.profiles.push(newProfile);
    db.staff_details.push(newDetails);

    db.activity_log.push({
      id: "log-" + Math.random().toString(36).substr(2, 9),
      profile_id: req.user!.id,
      action_type: "STAFF_CREATED",
      description: `Registered new coordinator: ${full_name} (${assigned_region})`,
      created_at: new Date().toISOString()
    });

    writeDB(db);

    res.status(201).json({
      staff: {
        profile: newProfile,
        details: newDetails,
        volunteer_count: 0
      },
      credentials: {
        email,
        password: tempPassword
      }
    });
  });

  // API Route: Opportunities Overview
  app.get("/api/opportunities", authenticate, (req, res) => {
    const db = readDB();
    const user = req.user!;

    const oppsWithDetails = db.opportunities.map(o => {
      const site = db.sites.find(s => s.id === o.site_id);
      const signups = db.opportunity_signups.filter(s => s.opportunity_id === o.id);
      const is_signed_up = signups.some(s => s.volunteer_id === user.id);
      return {
        ...o,
        site,
        signup_count: signups.length,
        is_signed_up
      };
    });

    res.json(oppsWithDetails);
  });

  // API Route: Create Opportunity (Staff/Admin)
  app.post("/api/opportunities", authenticate, (req, res) => {
    if (req.user!.role !== "staff" && req.user!.role !== "admin") {
      return res.status(403).json({ error: "Access denied" });
    }

    const { title, site_id, type, description, commitment_label, date, capacity } = req.body;
    if (!title || !site_id || !type || !description || !commitment_label || !date || !capacity) {
      return res.status(400).json({ error: "All opportunity fields are required" });
    }

    const db = readDB();
    const newOpp: Opportunity = {
      id: "opp-" + Math.random().toString(36).substr(2, 9),
      title,
      site_id,
      type,
      description,
      commitment_label,
      date,
      capacity: parseInt(capacity),
      created_by_staff_id: req.user!.id,
      status: "open"
    };

    db.opportunities.push(newOpp);

    db.activity_log.push({
      id: "log-" + Math.random().toString(36).substr(2, 9),
      profile_id: req.user!.id,
      action_type: "OPPORTUNITY_CREATED",
      description: `Created opportunity: ${title}`,
      created_at: new Date().toISOString()
    });

    writeDB(db);
    res.status(201).json(newOpp);
  });

  // API Route: Sign up for Opportunity (Volunteer) or Manually register (Staff)
  app.post("/api/opportunities/:id/signup", authenticate, (req, res) => {
    const db = readDB();
    const user = req.user!;
    const opportunity_id = req.params.id;
    const opp = db.opportunities.find(o => o.id === opportunity_id);
    if (!opp) return res.status(404).json({ error: "Opportunity not found" });

    let volunteer_id = user.id;

    // Staff can manually add a volunteer
    if (user.role === "staff" || user.role === "admin") {
      if (!req.body.volunteer_id) {
        return res.status(400).json({ error: "volunteer_id is required for coordinator registrations" });
      }
      volunteer_id = req.body.volunteer_id;
    }

    // Check if already signed up
    const existingIndex = db.opportunity_signups.findIndex(
      s => s.opportunity_id === opportunity_id && s.volunteer_id === volunteer_id
    );

    if (existingIndex !== -1) {
      return res.status(400).json({ error: "Volunteer is already signed up for this opportunity" });
    }

    const signup: OpportunitySignup = {
      opportunity_id,
      volunteer_id,
      signed_up_at: new Date().toISOString(),
      attended: false
    };

    db.opportunity_signups.push(signup);

    db.activity_log.push({
      id: "log-" + Math.random().toString(36).substr(2, 9),
      profile_id: user.id,
      action_type: "OPPORTUNITY_SIGNUP",
      description: `Signed up volunteer (${volunteer_id}) for: ${opp.title}`,
      created_at: new Date().toISOString()
    });

    writeDB(db);
    res.status(201).json(signup);
  });

  // API Route: Unsubscribe/cancel signup
  app.post("/api/opportunities/:id/cancel-signup", authenticate, (req, res) => {
    const db = readDB();
    const user = req.user!;
    const opportunity_id = req.params.id;
    let volunteer_id = user.id;

    if (user.role === "staff" || user.role === "admin") {
      volunteer_id = req.body.volunteer_id || user.id;
    }

    db.opportunity_signups = db.opportunity_signups.filter(
      s => !(s.opportunity_id === opportunity_id && s.volunteer_id === volunteer_id)
    );

    writeDB(db);
    res.json({ success: true });
  });

  // API Route: Get Opportunity Signups (Attendance checks)
  app.get("/api/opportunities/:id/signups", authenticate, (req, res) => {
    const db = readDB();
    const opportunity_id = req.params.id;
    
    const signups = db.opportunity_signups.filter(s => s.opportunity_id === opportunity_id);
    const detailedSignups = signups.map(s => {
      const vol = db.volunteers.find(v => v.profile_id === s.volunteer_id);
      const profile = db.profiles.find(p => p.id === s.volunteer_id);
      return {
        ...s,
        volunteer: vol,
        profile
      };
    });

    res.json(detailedSignups);
  });

  // API Route: Mark Complete & Log Hours (Staff/Admin)
  app.post("/api/opportunities/:id/complete", authenticate, (req, res) => {
    if (req.user!.role !== "staff" && req.user!.role !== "admin") {
      return res.status(403).json({ error: "Access denied" });
    }

    const opportunity_id = req.params.id;
    const { attendees, hours_to_log } = req.body; // attendees is array of volunteer profile_ids

    if (!attendees || !Array.isArray(attendees)) {
      return res.status(400).json({ error: "attendees array is required" });
    }

    const hours = parseInt(hours_to_log || "3");
    const db = readDB();

    // Find opportunity
    const oppIndex = db.opportunities.findIndex(o => o.id === opportunity_id);
    if (oppIndex === -1) return res.status(404).json({ error: "Opportunity not found" });

    db.opportunities[oppIndex].status = "completed";

    // Mark attendance in opportunity_signups
    db.opportunity_signups = db.opportunity_signups.map(s => {
      if (s.opportunity_id === opportunity_id) {
        s.attended = attendees.includes(s.volunteer_id);
      }
      return s;
    });

    // Credit hours to active volunteers
    db.volunteers = db.volunteers.map(v => {
      if (attendees.includes(v.profile_id)) {
        v.hours_logged += hours;
        
        // Also automatically mark pending volunteers as active if they completed their first opportunity
        if (v.status === "pending") {
          v.status = "active";
        }
      }
      return v;
    });

    db.activity_log.push({
      id: "log-" + Math.random().toString(36).substr(2, 9),
      profile_id: req.user!.id,
      action_type: "OPPORTUNITY_COMPLETED",
      description: `Marked opportunity '${db.opportunities[oppIndex].title}' as completed, logging ${hours} hours for ${attendees.length} volunteers.`,
      created_at: new Date().toISOString()
    });

    writeDB(db);
    res.json({ success: true });
  });

  // API Route: Tasks (with full RLS)
  app.get("/api/tasks", authenticate, (req, res) => {
    const db = readDB();
    const user = req.user!;
    let filteredTasks: Task[] = [];

    if (user.role === "admin") {
      filteredTasks = db.tasks;
    } else if (user.role === "staff") {
      // Staff can read tasks assigned to volunteers who are assigned to them, OR tasks created by them
      const myVolIds = db.volunteers.filter(v => v.coordinator_id === user.id).map(v => v.profile_id);
      filteredTasks = db.tasks.filter(t => 
        t.assigned_by_staff_id === user.id || myVolIds.includes(t.assigned_to_volunteer_id)
      );
    } else if (user.role === "volunteer") {
      filteredTasks = db.tasks.filter(t => t.assigned_to_volunteer_id === user.id);
    }

    // Attach human labels for frontend display
    const tasksWithDetails = filteredTasks.map(t => {
      const volProfile = db.profiles.find(p => p.id === t.assigned_to_volunteer_id);
      const staffProfile = db.profiles.find(p => p.id === t.assigned_by_staff_id);
      const opp = db.opportunities.find(o => o.id === t.linked_opportunity_id);
      return {
        ...t,
        volunteer_name: volProfile ? volProfile.full_name : "Unknown",
        staff_name: staffProfile ? staffProfile.full_name : "Unknown",
        opportunity_title: opp ? opp.title : null
      };
    });

    res.json(tasksWithDetails);
  });

  // API Route: Create Task (Staff/Admin)
  app.post("/api/tasks", authenticate, (req, res) => {
    if (req.user!.role !== "staff" && req.user!.role !== "admin") {
      return res.status(403).json({ error: "Access denied" });
    }

    const { title, description, assigned_to_volunteer_id, due_date, priority, linked_opportunity_id } = req.body;
    if (!title || !assigned_to_volunteer_id || !due_date || !priority) {
      return res.status(400).json({ error: "Missing required task fields" });
    }

    const db = readDB();

    // RLS Verification for Staff
    const assignee = db.volunteers.find(v => v.profile_id === assigned_to_volunteer_id);
    if (!assignee) return res.status(404).json({ error: "Assignee volunteer not found" });
    if (req.user!.role === "staff" && assignee.coordinator_id !== req.user!.id) {
      return res.status(403).json({ error: "Cannot assign tasks to another staff's volunteer" });
    }

    const newTask: Task = {
      id: "task-" + Math.random().toString(36).substr(2, 9),
      title,
      description: description || "",
      assigned_to_volunteer_id,
      assigned_by_staff_id: req.user!.id,
      due_date,
      priority,
      status: "todo",
      linked_opportunity_id: linked_opportunity_id || null
    };

    db.tasks.push(newTask);

    db.activity_log.push({
      id: "log-" + Math.random().toString(36).substr(2, 9),
      profile_id: req.user!.id,
      action_type: "TASK_CREATED",
      description: `Assigned task '${title}' to volunteer: ${db.profiles.find(p => p.id === assigned_to_volunteer_id)?.full_name}`,
      created_at: new Date().toISOString()
    });

    writeDB(db);
    res.status(201).json(newTask);
  });

  // API Route: Bulk Assign Task to all volunteers at a site (Staff/Admin)
  app.post("/api/tasks/bulk-site-assign", authenticate, (req, res) => {
    if (req.user!.role !== "staff" && req.user!.role !== "admin") {
      return res.status(403).json({ error: "Access denied" });
    }

    const { title, description, site_preference, due_date, priority, linked_opportunity_id } = req.body;
    if (!title || !site_preference || !due_date || !priority) {
      return res.status(400).json({ error: "Missing required bulk task fields" });
    }

    const db = readDB();
    
    // Find all active/pending volunteers at this site
    let targets = db.volunteers.filter(v => v.site_preference === site_preference);
    
    // RLS: Staff can only assign to their own volunteers
    if (req.user!.role === "staff") {
      targets = targets.filter(v => v.coordinator_id === req.user!.id);
    }

    if (targets.length === 0) {
      return res.status(404).json({ error: "No matching volunteers found at this site" });
    }

    const newTasks: Task[] = [];
    targets.forEach(v => {
      const newTask: Task = {
        id: "task-" + Math.random().toString(36).substr(2, 9),
        title,
        description: description || "",
        assigned_to_volunteer_id: v.profile_id,
        assigned_by_staff_id: req.user!.id,
        due_date,
        priority,
        status: "todo",
        linked_opportunity_id: linked_opportunity_id || null
      };
      db.tasks.push(newTask);
      newTasks.push(newTask);
    });

    db.activity_log.push({
      id: "log-" + Math.random().toString(36).substr(2, 9),
      profile_id: req.user!.id,
      action_type: "TASK_BULK_CREATED",
      description: `Bulk-assigned task '${title}' to ${targets.length} volunteers at ${site_preference}`,
      created_at: new Date().toISOString()
    });

    writeDB(db);
    res.status(201).json({ count: newTasks.length, tasks: newTasks });
  });

  // API Route: Update Task status (Volunteer/Staff/Admin)
  app.put("/api/tasks/:id", authenticate, (req, res) => {
    const db = readDB();
    const user = req.user!;
    const taskId = req.params.id;

    const taskIndex = db.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return res.status(404).json({ error: "Task not found" });

    const task = db.tasks[taskIndex];

    // RLS Check
    if (user.role === "volunteer" && task.assigned_to_volunteer_id !== user.id) {
      return res.status(403).json({ error: "Access denied. Cannot update another volunteer's task" });
    } else if (user.role === "staff") {
      const vol = db.volunteers.find(v => v.profile_id === task.assigned_to_volunteer_id);
      if (vol && vol.coordinator_id !== user.id && task.assigned_by_staff_id !== user.id) {
        return res.status(403).json({ error: "Access denied. Volunteer belongs to another coordinator" });
      }
    }

    const { status, priority, due_date, title, description } = req.body;
    if (status) task.status = status;
    if (priority) task.priority = priority;
    if (due_date) task.due_date = due_date;
    if (title) task.title = title;
    if (description !== undefined) task.description = description;

    // Log complete action if completed
    if (status === "done") {
      db.activity_log.push({
        id: "log-" + Math.random().toString(36).substr(2, 9),
        profile_id: user.id,
        action_type: "TASK_COMPLETED",
        description: `Completed task: '${task.title}'`,
        created_at: new Date().toISOString()
      });
    }

    writeDB(db);
    res.json(task);
  });

  // API Route: Delete Task
  app.delete("/api/tasks/:id", authenticate, (req, res) => {
    if (req.user!.role !== "staff" && req.user!.role !== "admin") {
      return res.status(403).json({ error: "Access denied" });
    }

    const db = readDB();
    const taskId = req.params.id;
    const taskIndex = db.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return res.status(404).json({ error: "Task not found" });

    const task = db.tasks[taskIndex];
    // Staff RLS check
    if (req.user!.role === "staff") {
      const vol = db.volunteers.find(v => v.profile_id === task.assigned_to_volunteer_id);
      if (vol && vol.coordinator_id !== req.user!.id && task.assigned_by_staff_id !== req.user!.id) {
        return res.status(403).json({ error: "Access denied" });
      }
    }

    db.tasks = db.tasks.filter(t => t.id !== taskId);
    
    db.activity_log.push({
      id: "log-" + Math.random().toString(36).substr(2, 9),
      profile_id: req.user!.id,
      action_type: "TASK_DELETED",
      description: `Deleted task: '${task.title}'`,
      created_at: new Date().toISOString()
    });

    writeDB(db);
    res.json({ success: true });
  });

  // API Route: Get Messages (Threads 1:1)
  // Threads are always 1:1 staff <-> volunteer
  app.get("/api/messages", authenticate, (req, res) => {
    const db = readDB();
    const user = req.user!;
    let filteredMessages: Message[] = [];

    if (user.role === "admin") {
      filteredMessages = db.messages;
    } else if (user.role === "staff") {
      // Staff can only read messages tied to their own volunteers
      const myVolIds = db.volunteers.filter(v => v.coordinator_id === user.id).map(v => v.profile_id);
      filteredMessages = db.messages.filter(m => 
        m.sender_id === user.id || 
        m.recipient_id === user.id || 
        myVolIds.includes(m.sender_id) || 
        myVolIds.includes(m.recipient_id)
      );
    } else if (user.role === "volunteer") {
      filteredMessages = db.messages.filter(m => m.sender_id === user.id || m.recipient_id === user.id);
    }

    res.json(filteredMessages);
  });

  // API Route: Post Message
  app.post("/api/messages", authenticate, (req, res) => {
    const { recipient_id, body } = req.body;
    if (!recipient_id || !body) {
      return res.status(400).json({ error: "Recipient ID and message body are required" });
    }

    const db = readDB();
    const user = req.user!;

    // Enforce 1:1 Staff-Volunteer Thread Rule
    // Volunteers can only message their coordinator
    if (user.role === "volunteer") {
      const volRecord = db.volunteers.find(v => v.profile_id === user.id);
      if (!volRecord || volRecord.coordinator_id !== recipient_id) {
        return res.status(403).json({ error: "Volunteers can only send messages to their assigned coordinator" });
      }
    } else if (user.role === "staff") {
      // Staff can only message their own volunteers
      const volRecord = db.volunteers.find(v => v.profile_id === recipient_id);
      if (!volRecord || volRecord.coordinator_id !== user.id) {
        return res.status(403).json({ error: "Staff can only send messages to their assigned volunteers" });
      }
    }

    // Determine standard thread ID (alphabetical sorting of user IDs)
    const thread_id = [user.id, recipient_id].sort().join("_");

    const newMsg: Message = {
      id: "msg-" + Math.random().toString(36).substr(2, 9),
      thread_id,
      sender_id: user.id,
      recipient_id,
      body,
      sent_at: new Date().toISOString(),
      read: false
    };

    db.messages.push(newMsg);
    writeDB(db);

    res.status(201).json(newMsg);
  });

  // API Route: Broadcast message to site or tag (Staff/Admin)
  app.post("/api/messages/broadcast", authenticate, (req, res) => {
    if (req.user!.role !== "staff" && req.user!.role !== "admin") {
      return res.status(403).json({ error: "Access denied" });
    }

    const { target_type, target_value, body } = req.body; // target_type: 'site' | 'tag', target_value: e.g. 'Vashi Creek' or 'Water Quality'
    if (!target_type || !target_value || !body) {
      return res.status(400).json({ error: "target_type, target_value and body are required" });
    }

    const db = readDB();
    const user = req.user!;

    // Find volunteers matching target
    let activeVolunteers = db.volunteers.filter(v => v.status === "active");
    if (user.role === "staff") {
      activeVolunteers = activeVolunteers.filter(v => v.coordinator_id === user.id);
    }

    let recipients: Volunteer[] = [];
    if (target_type === "site") {
      recipients = activeVolunteers.filter(v => v.site_preference === target_value);
    } else if (target_type === "tag") {
      recipients = activeVolunteers.filter(v => v.interests.includes(target_value));
    }

    if (recipients.length === 0) {
      return res.status(404).json({ error: "No matching active volunteers found to broadcast to" });
    }

    const broadcastMsgs: Message[] = [];
    recipients.forEach(r => {
      const thread_id = [user.id, r.profile_id].sort().join("_");
      const newMsg: Message = {
        id: "msg-" + Math.random().toString(36).substr(2, 9),
        thread_id,
        sender_id: user.id,
        recipient_id: r.profile_id,
        body: `[BROADCAST to ${target_value}]: ${body}`,
        sent_at: new Date().toISOString(),
        read: false
      };
      db.messages.push(newMsg);
      broadcastMsgs.push(newMsg);
    });

    db.activity_log.push({
      id: "log-" + Math.random().toString(36).substr(2, 9),
      profile_id: user.id,
      action_type: "BROADCAST_MESSAGE",
      description: `Broadcasted a message to all volunteers at '${target_value}' (Count: ${recipients.length})`,
      created_at: new Date().toISOString()
    });

    writeDB(db);
    res.json({ count: recipients.length });
  });

  // API Route: Mark messages as read
  app.post("/api/messages/read-thread", authenticate, (req, res) => {
    const { thread_id } = req.body;
    if (!thread_id) return res.status(400).json({ error: "thread_id is required" });

    const db = readDB();
    const user = req.user!;

    db.messages = db.messages.map(m => {
      if (m.thread_id === thread_id && m.recipient_id === user.id) {
        m.read = true;
      }
      return m;
    });

    writeDB(db);
    res.json({ success: true });
  });

  // API Route: Activity Logs (Admin only)
  app.get("/api/activity-log", authenticate, (req, res) => {
    if (req.user!.role !== "admin") {
      return res.status(403).json({ error: "Access denied" });
    }
    const db = readDB();
    // Sort reverse chronological
    const sortedLogs = [...db.activity_log].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    res.json(sortedLogs);
  });

  // API Route: Stats for Dashboard (Role Aware)
  app.get("/api/stats", authenticate, (req, res) => {
    const db = readDB();
    const user = req.user!;
    const nowStr = new Date().toISOString();

    if (user.role === "admin") {
      const totalVolunteers = db.volunteers.length;
      const totalStaff = db.profiles.filter(p => p.role === "staff").length;
      const activeOpps = db.opportunities.filter(o => o.status === "open").length;
      const totalHours = db.volunteers.reduce((sum, v) => sum + v.hours_logged, 0);
      const sitesCovered = db.sites.length;

      // Group volunteers by coordinator
      const volunteersByCoord: Record<string, number> = {};
      db.profiles.filter(p => p.role === "staff").forEach(s => {
        volunteersByCoord[s.full_name] = db.volunteers.filter(v => v.coordinator_id === s.id).length;
      });

      res.json({
        totalVolunteers,
        totalStaff,
        activeOpps,
        totalHours,
        sitesCovered,
        volunteersByCoord,
        recentLogs: db.activity_log.slice(-10).reverse()
      });
    } else if (user.role === "staff") {
      const myVols = db.volunteers.filter(v => v.coordinator_id === user.id);
      const myVolIds = myVols.map(v => v.profile_id);

      const totalVolunteers = myVols.length;
      const activeThisWeek = myVols.filter(v => v.status === "active").length;
      const hoursLogged = myVols.reduce((sum, v) => sum + v.hours_logged, 0);
      
      const openTasks = db.tasks.filter(t => 
        myVolIds.includes(t.assigned_to_volunteer_id) && t.status !== "done"
      ).length;

      const unreadMessages = db.messages.filter(m => 
        m.recipient_id === user.id && !m.read
      ).length;

      res.json({
        totalVolunteers,
        activeThisWeek,
        hoursLogged,
        openTasks,
        unreadMessages
      });
    } else if (user.role === "volunteer") {
      const vol = db.volunteers.find(v => v.profile_id === user.id);
      const hours = vol ? vol.hours_logged : 0;
      const visits = db.opportunity_signups.filter(s => s.volunteer_id === user.id && s.attended).length;
      const signups = db.opportunity_signups.filter(s => s.volunteer_id === user.id).length;

      res.json({
        hours,
        visits,
        signups,
        // Global stats for impact dashboard
        globalVolunteers: db.volunteers.length,
        plasticRemovedKg: 1240 + hours * 15, // dynamic formula for realism
        saplingsCounted: 450 + hours * 8,
        raftHouseholdsReached: 120 + hours * 3
      });
    }
  });

  // Vite development middleware vs Static Production bundle
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // SPA Routing Fallback
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Volunteer Bank custom Express server running at http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server", err);
});
