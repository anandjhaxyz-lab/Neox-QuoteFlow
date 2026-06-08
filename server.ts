import express from "express";
import path from "path";
import { Resend } from "resend";
import dotenv from "dotenv";
import fs from "fs";
import os from "os";

dotenv.config();

// Initialize JSON Database (Pure JS Mode) with safe permissions fallback
const getDbFile = () => {
  // We prefer the user's home directory (e.g. C:\Users\Username\.quoteflow\local_db.json)
  // because the home directory is ALWAYS writable and persists safely across all versions and installations.
  const homeDir = os.homedir();
  const dbFolder = path.join(homeDir, ".quoteflow");
  const homeDbPath = path.join(dbFolder, "local_db.json");
  const localPath = path.join(process.cwd(), "local_db.json");

  try {
    if (!fs.existsSync(dbFolder)) {
      fs.mkdirSync(dbFolder, { recursive: true });
    }
    
    // Copy the existing database from current working folder if it exists and home doesn't have one
    if (!fs.existsSync(homeDbPath) && fs.existsSync(localPath)) {
      try {
        fs.copyFileSync(localPath, homeDbPath);
        console.log("Migrating existing local_db.json to home directory: " + homeDbPath);
      } catch (err) {
        console.error("Failed to copy local_db.json to home directory, continuing...", err);
      }
    }
    
    // Validate we can write to the home directory database
    const testFile = path.join(dbFolder, ".write-test-" + Date.now());
    fs.writeFileSync(testFile, "test");
    fs.unlinkSync(testFile);
    
    // If we can write, verify homeDbPath file exists or write default template
    if (!fs.existsSync(homeDbPath)) {
      fs.writeFileSync(homeDbPath, JSON.stringify({
        users: [],
        companies: [],
        companyProfile: [],
        clients: [],
        products: [],
        quotations: [],
        counters: []
      }, null, 2));
    }
    
    console.log("Using home directory database at: " + homeDbPath);
    return homeDbPath;
  } catch (e) {
    console.error("Home directory database path configuration failed, checking other options...", e);
  }

  // Determine if process.cwd() is writable
  let isLocalWritable = false;
  try {
    const testFile = path.join(process.cwd(), ".write-test-" + Date.now());
    fs.writeFileSync(testFile, "test");
    fs.unlinkSync(testFile);
    isLocalWritable = true;
  } catch (e) {
    isLocalWritable = false;
  }

  if (isLocalWritable) {
    console.log("Using local database at: " + localPath);
    return localPath;
  }

  // If local is not writable, we must use /tmp/local_db.json
  const tmpPath = path.join("/tmp", "local_db.json");
  try {
    if (!fs.existsSync("/tmp")) {
      fs.mkdirSync("/tmp", { recursive: true });
    }
    if (!fs.existsSync(tmpPath)) {
      if (fs.existsSync(localPath)) {
        fs.copyFileSync(localPath, tmpPath);
        console.log("Copied baked-in local_db.json database to /tmp/local_db.json");
      } else {
        // Create an empty database template
        fs.writeFileSync(tmpPath, JSON.stringify({
          users: [],
          companies: [],
          companyProfile: [],
          clients: [],
          products: [],
          quotations: [],
          counters: []
        }, null, 2));
        console.log("Created fresh local_db.json database in /tmp/local_db.json");
      }
    }
    console.log("Using /tmp database at: " + tmpPath);
    return tmpPath;
  } catch (err) {
    console.error("Failed to set up database in /tmp, falling back to localPath:", err);
    return localPath;
  }
};

const dbPath = getDbFile();

interface DbData {
  users: any[];
  companies: any[];
  companyProfile: any[];
  clients: any[];
  products: any[];
  quotations: any[];
  counters: any[];
}

let db: DbData = {
  users: [],
  companies: [],
  companyProfile: [],
  clients: [],
  products: [],
  quotations: [],
  counters: []
};

function loadDb() {
  if (dbPath && fs.existsSync(dbPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
      db = {
        users: Array.isArray(data.users) ? data.users : [],
        companies: Array.isArray(data.companies) ? data.companies : [],
        companyProfile: Array.isArray(data.companyProfile) ? data.companyProfile : [],
        clients: Array.isArray(data.clients) ? data.clients : [],
        products: Array.isArray(data.products) ? data.products : [],
        quotations: Array.isArray(data.quotations) ? data.quotations : [],
        counters: Array.isArray(data.counters) ? data.counters : []
      };
    } catch (e) {
      console.error("Failed to load DB", e);
    }
  } else {
    saveDb();
  }
}

function runMigrations() {
  loadDb();
  let hasMadeChanges = false;

  // Migration: Ensure at least one super_admin exists if there are users
  if (db.users.length > 0 && !db.users.find(u => u.role === 'super_admin')) {
    db.users[0].role = 'super_admin';
    db.users[0].status = 'active';
    // If they don't have a company, give them a SUPER placeholder so they can access system
    if (!db.users[0].companyId || db.users[0].companyId === 'NONE') {
      db.users[0].companyId = 'SUPER';
    }
    console.log(`Migrated user ${db.users[0].email} to super_admin`);
    hasMadeChanges = true;
  }

  // Migration: Ensure each company setup has at least one 'admin' or 'super_admin' user.
  if (db.companies && db.companies.length > 0) {
    db.companies.forEach(company => {
      const companyUsers = db.users.filter(u => u.companyId === company.id);
      if (companyUsers.length > 0) {
        const hasAdmin = companyUsers.some(u => u.role === 'admin' || u.role === 'super_admin');
        if (!hasAdmin) {
          // Promote the first user of this company to 'admin'
          const userToPromote = db.users.find(u => u.id === companyUsers[0].id);
          if (userToPromote) {
            userToPromote.role = 'admin';
            userToPromote.status = 'active';
            console.log(`Promoted user ${userToPromote.email} to company admin for company: ${company.name}`);
            hasMadeChanges = true;
          }
        }
      }
    });
  }

  // Migration: Ensure all quotations have a valid creator to prevent 'Unknown' on existing data
  if (db.quotations && db.quotations.length > 0) {
    db.quotations.forEach(q => {
      if (!q.createdBy || q.createdBy === 'Unknown') {
        if (db.users.length > 0) {
          // Map to the first user or creator of the company
          const companyUsers = db.users.filter(u => u.companyId === q.companyId);
          const defaultUser = companyUsers.length > 0 ? companyUsers[0] : db.users[0];
          q.createdBy = defaultUser.id;
          hasMadeChanges = true;
          console.log(`Migrated quotation ${q.quoteNumber || q.id} creator to ${defaultUser.email}`);
        }
      }
    });
  }

  if (hasMadeChanges) {
    saveDb();
  }
}

function saveDb() {
  try {
    if (!fs.existsSync(path.dirname(dbPath))) {
      fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    }
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
  } catch (err) {
    console.error("Failed to write database file:", err);
  }
}

// Initial DB boot and migration
runMigrations();

let resend: Resend | null = null;

function getResend() {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return null;
    }
    resend = new Resend(apiKey);
  }
  return resend;
}

async function startServer() {
  const app = express();
  const PORT = process.env.NODE_ENV === "production" ? (process.env.PORT ? parseInt(process.env.PORT, 10) : 3000) : 3000;

  app.use(express.json({ limit: '50mb' }));

  // --- HEALTH API ---
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", mode: "local", timestamp: new Date().toISOString() });
  });

  // --- DATABASE RELOAD INTERCEPTOR MIDDLEWARE ---
  // This automatically reloads the database from disk before serving any API request.
  // This is highly critical for local/offline desktop applications to prevent data concurrency conflicts
  // or stale in-memory arrays silently overwriting newer entries in local_db.json.
  app.use("/api", (req, res, next) => {
    try {
      loadDb();
    } catch (err) {
      console.error("Database reload in middleware failed:", err);
    }
    next();
  });

  // --- AUTH API ---
  app.post("/api/auth/signup", (req, res) => {
    const { id, email, password, fullName, companyName } = req.body;
    try {
      // If it is the very first user, they are a super_admin.
      // If they are registering with a company name, they are an 'admin' of that company.
      // Otherwise, default to 'sales'.
      const isFirstUser = db.users.length === 0;
      const role = isFirstUser ? 'super_admin' : (req.body.role || (companyName ? 'admin' : 'sales'));
      
      let finalCompanyId = req.body.companyId || 'NONE';
      
      // If companyName is provided, create a company
      if (companyName) {
        const newCompanyId = "comp_" + Date.now();
        const newCompany = {
          id: newCompanyId,
          name: companyName,
          plan: 'free',
          status: 'active',
          createdAt: new Date().toISOString()
        };
        db.companies.push(newCompany);
        
      // Also create a company profile entry
      db.companyProfile.push({
        id: newCompanyId,
        name: companyName,
        address: '',
        certifications: []
      });
        
        finalCompanyId = newCompanyId;
      } else if (isFirstUser) {
        // First user without companyName? Assign to a special SUPER company if needed
        finalCompanyId = 'SUPER';
      }

      const newUser = { 
        id: id || ("user_" + Date.now()), 
        email, 
        password, 
        displayName: fullName || email, 
        role, 
        companyId: finalCompanyId, 
        status: 'active', 
        createdAt: new Date().toISOString() 
      };
      
      db.users.push(newUser);
      saveDb();
      res.json(newUser);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    const user = db.users.find(u => u.email === email && u.password === password);
    if (user) {
      res.json(user);
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  app.get("/api/users", (req, res) => {
    try {
      const { companyId } = req.query;
      let users;
      if (companyId === 'SUPER') {
        users = db.users;
      } else {
        users = db.users.filter(u => u.companyId === companyId);
      }
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/users/:id", (req, res) => {
    const user = db.users.find(u => u.id === req.params.id);
    if (user) res.json(user);
    else res.status(404).json({ error: "User not found" });
  });

  app.patch("/api/users/:id", (req, res) => {
    const userId = req.params.id;
    const updates = req.body;
    const userIndex = db.users.findIndex(u => u.id === userId);
    if (userIndex > -1) {
      db.users[userIndex] = { ...db.users[userIndex], ...updates };
      saveDb();
      res.json(db.users[userIndex]);
    } else {
      res.status(404).json({ error: "User not found" });
    }
  });

  app.delete("/api/users/:id", (req, res) => {
    try {
      db.users = db.users.filter(u => u.id !== req.params.id);
      saveDb();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- COMPANIES API ---
  app.get("/api/companies", (req, res) => {
    try {
      res.json(db.companies);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/companies/all", (req, res) => {
    res.json(db.companies);
  });

  app.get("/api/companies/:id", (req, res) => {
    const comp = db.companies.find(c => c.id === req.params.id);
    res.json(comp || null);
  });

  app.post("/api/companies", (req, res) => {
    try {
      const data = req.body;
      db.companies.push({ ...data, createdAt: new Date().toISOString() });
      saveDb();
      res.json({ id: data.id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/companies/:id", (req, res) => {
    try {
      const updates = req.body;
      const index = db.companies.findIndex(c => c.id === req.params.id);
      if (index > -1) {
        db.companies[index] = { ...db.companies[index], ...updates };
        saveDb();
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Not found" });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/companies/:id", (req, res) => {
    try {
      const { id } = req.params;
      db.companies = db.companies.filter(c => c.id !== id);
      db.companyProfile = db.companyProfile.filter(p => p.id !== id);
      db.clients = db.clients.filter(c => c.companyId !== id);
      db.products = db.products.filter(p => p.companyId !== id);
      db.quotations = db.quotations.filter(q => q.companyId !== id);
      db.users.forEach(u => {
        if (u.companyId === id) {
          u.companyId = 'NONE';
          u.status = 'suspended';
        }
      });
      saveDb();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/companyProfile/:id", (req, res) => {
    console.log(`[DB] Fetching profile for ID: ${req.params.id}`);
    const profile = db.companyProfile.find(p => p.id === req.params.id);
    if (profile) {
      const p = { ...profile };
      if (typeof p.certifications === 'string') {
        try {
          p.certifications = JSON.parse(p.certifications || "[]");
        } catch (e) {
          p.certifications = [];
        }
      }
      res.json(p);
    } else {
      console.warn(`[DB] Profile not found for ID: ${req.params.id}`);
      res.json(null);
    }
  });

  app.post("/api/companyProfile/:id", (req, res) => {
    const { name, address, gstin, contactEmail, contactPhone, bankDetails, certifications, logo, stamp, signature, termsAndConditions, tagline, signatoryTitle } = req.body;
    const index = db.companyProfile.findIndex(p => p.id === req.params.id);
    const profile = { 
      id: req.params.id, 
      name, 
      address, 
      gstin, 
      contactEmail, 
      contactPhone, 
      bankDetails,
      logo,
      stamp,
      signature,
      termsAndConditions,
      tagline,
      signatoryTitle,
      certifications: Array.isArray(certifications) ? certifications : []
    };
    if (index > -1) db.companyProfile[index] = profile;
    else db.companyProfile.push(profile);
    saveDb();
    res.json({ success: true });
  });

  // --- CLIENTS API ---
  app.get("/api/clients", (req, res) => {
    const { companyId } = req.query;
    let clients;
    if (companyId === 'SUPER') {
      clients = db.clients;
    } else {
      clients = db.clients.filter(c => c.companyId === companyId);
    }
    res.json(clients);
  });

  app.post("/api/clients", (req, res) => {
    const id = "client_" + Date.now();
    const data = { ...req.body, id };
    db.clients.push(data);
    saveDb();
    res.json(data);
  });

  app.patch("/api/clients/:id", (req, res) => {
    const updates = req.body;
    const index = db.clients.findIndex(c => c.id === req.params.id);
    if (index > -1) {
      db.clients[index] = { ...db.clients[index], ...updates };
      saveDb();
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Not found" });
    }
  });

  app.delete("/api/clients/:id", (req, res) => {
    db.clients = db.clients.filter(c => c.id !== req.params.id);
    saveDb();
    res.json({ success: true });
  });

  // --- PRODUCTS API ---
  app.get("/api/products", (req, res) => {
    const { companyId } = req.query;
    let products;
    if (companyId === 'SUPER') {
      products = [...db.products];
    } else {
      products = db.products.filter(p => p.companyId === companyId);
    }
    products.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    const processed = products.map((p: any) => {
      try {
        const specs = typeof p.specifications === 'string' ? JSON.parse(p.specifications || "[]") : (p.specifications || []);
        return { ...p, specifications: specs };
      } catch (e) {
        return { ...p, specifications: [] };
      }
    });
    res.json(processed);
  });

  app.post("/api/products", (req, res) => {
    const id = "prod_" + Date.now();
    const data = { ...req.body, id };
    if (data.specifications && typeof data.specifications !== 'string') {
      data.specifications = JSON.stringify(data.specifications);
    }
    db.products.push(data);
    saveDb();
    res.json(data);
  });

  app.patch("/api/products/:id", (req, res) => {
    const data = { ...req.body };
    if (data.specifications && typeof data.specifications !== 'string') {
      data.specifications = JSON.stringify(data.specifications);
    }
    const index = db.products.findIndex(p => p.id === req.params.id);
    if (index > -1) {
      db.products[index] = { ...db.products[index], ...data };
      saveDb();
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Not found" });
    }
  });

  app.delete("/api/products/:id", (req, res) => {
    db.products = db.products.filter(p => p.id !== req.params.id);
    saveDb();
    res.json({ success: true });
  });

  // --- QUOTATIONS API ---
  app.get("/api/quotations", (req, res) => {
    const { companyId } = req.query;
    let quotes;
    if (companyId === 'SUPER') {
      quotes = [...db.quotations];
    } else {
      quotes = db.quotations.filter(q => q.companyId === companyId);
    }
    quotes.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    const processed = quotes.map((q: any) => {
      try {
        const client = typeof q.client === 'string' ? JSON.parse(q.client || "{}") : (q.client || {});
        const items = typeof q.items === 'string' ? JSON.parse(q.items || "[]") : (q.items || []);
        return { ...q, client, items };
      } catch (e) {
        return { ...q, client: {}, items: [] };
      }
    });
    res.json(processed);
  });

  app.get("/api/quotations/:id", (req, res) => {
    const q = db.quotations.find(quote => quote.id === req.params.id);
    if (q) {
      const qCopy = { ...q };
      qCopy.client = typeof qCopy.client === 'string' ? JSON.parse(qCopy.client || "{}") : (qCopy.client || {});
      qCopy.items = typeof qCopy.items === 'string' ? JSON.parse(qCopy.items || "[]") : (qCopy.items || []);
      res.json(qCopy);
    } else {
      res.status(404).json({ error: "Not found" });
    }
  });

  app.post("/api/quotations", (req, res) => {
    const id = req.body.id || "quote_" + Date.now();
    const data = { ...req.body, id, createdAt: new Date().toISOString() };
    
    // Normalize client details
    const clientData = data.clientDetails || data.client;
    if (clientData && typeof clientData !== 'string') {
      data.client = JSON.stringify(clientData);
      data.clientDetails = clientData;
    }
    
    if (data.items && typeof data.items !== 'string') data.items = JSON.stringify(data.items);
    
    db.quotations.push(data);
    saveDb();
    res.json({ id });
  });

  app.patch("/api/quotations/:id", (req, res) => {
    const data = { ...req.body };
    
    // Normalize client details
    const clientData = data.clientDetails || data.client;
    if (clientData && typeof clientData !== 'string') {
      data.client = JSON.stringify(clientData);
      data.clientDetails = clientData;
    }
    
    if (data.items && typeof data.items !== 'string') data.items = JSON.stringify(data.items);
    
    const index = db.quotations.findIndex(q => q.id === req.params.id);
    if (index > -1) {
      db.quotations[index] = { ...db.quotations[index], ...data, updatedAt: new Date().toISOString() };
      saveDb();
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Not found" });
    }
  });

  app.delete("/api/quotations/:id", (req, res) => {
    db.quotations = db.quotations.filter(q => q.id !== req.params.id);
    saveDb();
    res.json({ success: true });
  });

  app.post("/api/quotations/:id/duplicate", (req, res) => {
    try {
      const original = db.quotations.find(q => q.id === req.params.id);
      if (!original) return res.status(404).json({ error: "Quotation not found" });
      
      const id = "quote_" + Date.now();
      const duplicate = { 
        ...original, 
        id, 
        quoteNumber: original.quoteNumber + "-COPY",
        status: "Draft",
        createdAt: new Date().toISOString()
      };
      db.quotations.push(duplicate);
      saveDb();
      res.json(duplicate);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- COUNTERS API ---
  app.get("/api/counters/:id", (req, res) => {
    const c = db.counters.find(count => count.id === req.params.id);
    res.json(c || { id: req.params.id, count: 0 });
  });

  app.post("/api/counters/:id/increment", (req, res) => {
    const index = db.counters.findIndex(c => c.id === req.params.id);
    if (index > -1) {
      db.counters[index].count++;
    } else {
      db.counters.push({ id: req.params.id, count: 1 });
    }
    saveDb();
    res.json({ success: true });
  });

  app.get("/api/check-config", (req, res) => {
    res.json({
      resendConfigured: !!process.env.RESEND_API_KEY,
      localMode: true
    });
  });

  // API Route to send invitation email
  app.post("/api/send-invitation", async (req, res) => {
    const { email, companyName, role, inviteLink } = req.body;
    try {
      const resendClient = getResend();
      if (!resendClient) return res.status(503).json({ error: "Email service not configured" });
      const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
      const { data, error } = await resendClient.emails.send({
        from: fromEmail,
        to: [email],
        subject: `Invitation to join ${companyName} on QuoteFlow`,
        html: `<p>You have been invited to join ${companyName} as ${role}. Link: ${inviteLink}</p>`,
      });
      if (error) return res.status(400).json(error);
      res.status(200).json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
