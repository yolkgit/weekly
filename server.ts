
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticateToken } from './authMiddleware.ts';
import type { AuthRequest } from './authMiddleware.ts';

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-this';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- Auth API ---

app.post('/api/auth/signup', async (req, res) => {
    try {
        console.log("Signup Request Body:", req.body);
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

        console.log("Checking for existing user...");
        const existingUser = await (prisma as any).user.findUnique({ where: { email } });
        if (existingUser) return res.status(400).json({ error: 'User already exists' });

        console.log("Hashing password...");
        const hashedPassword = await bcrypt.hash(password, 10);

        console.log("Creating user in DB...");
        const user = await (prisma as any).user.create({
            data: { email, password: hashedPassword }
        });

        console.log("Signing token...");
        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });

        console.log("Signup successful!");
        res.json({ token, user: { id: user.id, email: user.email } });
    } catch (e: any) {
        console.error("Signup Error:", e);
        res.status(500).json({ error: 'Signup failed: ' + (e.message || String(e)) });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        console.log("Login Request:", req.body);
        const { email, password } = req.body;

        console.log("Finding user...");
        const user = await (prisma as any).user.findUnique({ where: { email } });
        if (!user) return res.status(400).json({ error: 'User not found' });

        console.log("Comparing password...");
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(400).json({ error: 'Invalid password' });

        console.log("Signing token...");
        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });

        console.log("Login successful!");
        res.json({ token, user: { id: user.id, email: user.email, parentPassword: user.parentPassword } });
    } catch (e) {
        res.status(500).json({ error: 'Login failed' });
    }
});

app.post('/api/auth/parent-password', authenticateToken, async (req: AuthRequest, res) => {
    const { parentPassword } = req.body;
    if (!parentPassword || parentPassword.length < 4 || parentPassword.length > 8) {
        return res.status(400).json({ error: 'Password must be 4-8 digits' });
    }

    try {
        await (prisma as any).user.update({
            where: { id: (req as any).user!.id },
            data: { parentPassword }
        });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed to update parent password' });
    }
});

// --- Snapshot API (Protected) ---

app.get('/api/snapshots', authenticateToken, async (req: AuthRequest, res) => {
    const childId = req.query.childId as string | undefined;
    try {
        const whereClause: any = { child: { userId: (req as any).user!.id } };
        if (childId) {
            whereClause.childId = childId;
        }

        const snapshots = await (prisma as any).scheduleSnapshot.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' }
        });
        res.json(snapshots);
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch snapshots' });
    }
});

app.post('/api/snapshots', authenticateToken, async (req: AuthRequest, res) => {
    const { childId, name, date, schedule } = req.body;
    try {
        // Verify child owns by user
        const child = await prisma.child.findFirst({
            where: { id: childId as string, userId: (req as any).user!.id } as any
        });
        if (!child) return res.status(403).json({ error: 'Unauthorized' });

        const snapshot = await (prisma as any).scheduleSnapshot.create({
            data: { childId: childId as string, name, date, schedule }
        });
        res.json(snapshot);
    } catch (e) {
        res.status(500).json({ error: 'Failed to create snapshot' });
    }
});

app.delete('/api/snapshots/:id', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const snapshot = await (prisma as any).scheduleSnapshot.findFirst({
            where: { id: req.params.id as string, child: { userId: (req as any).user!.id } }
        });
        if (!snapshot) return res.status(404).json({ error: 'Snapshot not found' });

        await (prisma as any).scheduleSnapshot.delete({ where: { id: req.params.id as string } });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed to delete snapshot' });
    }
});


// --- Children API (Protected) ---

app.get('/api/children', authenticateToken, async (req: AuthRequest, res) => {
    try {
        console.log(`Fetching children for user: ${(req as any).user!.id}`);
        const children = await prisma.child.findMany({
            where: { userId: (req as any).user!.id } as any,
            include: {
                rewardConfig: true
            },
            orderBy: { createdAt: 'asc' }
        });
        console.log(`Found ${children.length} children`);
        res.json(children);
    } catch (error) {
        console.error("Failed to fetch children:", error);
        res.status(500).json({ error: 'Failed to fetch children' });
    }
});

app.post('/api/children', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const { name, color, grade, startTime, endTime } = req.body;

        const child = await prisma.child.create({
            data: {
                userId: (req as any).user!.id, // Link to user
                name,
                color,
                grade,
                startTime,
                endTime,
                rewardConfig: {
                    create: {}
                }
            } as any,
            include: { rewardConfig: true } as any
        });

        res.json(child);
    } catch (error) {
        console.error("Create child error:", error);
        res.status(500).json({ error: 'Failed to create child', details: (error as any).message });
    }
});

app.put('/api/children/:id', authenticateToken, async (req: AuthRequest, res) => {
    const { id } = req.params;
    const data = req.body;

    try {
        // Verify ownership
        const child = await prisma.child.findFirst({
            where: { id: id as string, user: { id: (req as any).user!.id } } as any
        });
        if (!child) return res.status(403).json({ error: 'Unauthorized' });

        const { name, color, grade, startTime, endTime, isPlanConfirmed } = data;

        const updated = await prisma.child.update({
            where: { id: id as string },
            data: {
                name,
                color,
                grade,
                startTime: startTime as string,
                endTime: endTime as string,
                isPlanConfirmed: !!isPlanConfirmed,
                updatedAt: new Date()
            } as any
        });
        res.json(updated);
    } catch (error) {
        console.error("Update child error:", error);
        res.status(500).json({ error: 'Failed to update child' });
    }
});

app.delete('/api/children/:id', authenticateToken, async (req: AuthRequest, res) => {
    const { id } = req.params;
    try {
        // Verify ownership
        const child = await prisma.child.findFirst({
            where: { id: id as string, user: { id: (req as any).user!.id } } as any
        });
        if (!child) return res.status(403).json({ error: 'Unauthorized' });

        await prisma.child.delete({ where: { id: id as string } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete child' });
    }
});

// --- Schedule API (Protected) ---

app.get('/api/schedules', authenticateToken, async (req: AuthRequest, res) => {
    const childId = req.query.childId as string | undefined;
    if (!childId) {
        return res.status(400).json({ error: 'Child ID required' });
    }

    // Verify ownership
    const child = await prisma.child.findFirst({
        where: { id: childId, user: { id: (req as any).user!.id } } as any
    });
    if (!child) return res.status(403).json({ error: 'Unauthorized' });

    try {
        const schedules = await prisma.timeSlot.findMany({
            where: { childId },
            orderBy: [
                { dayIndex: 'asc' },
                { startTime: 'asc' }
            ]
        });
        res.json(schedules);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch schedules' });
    }
});

app.post('/api/schedules/batch', authenticateToken, async (req: AuthRequest, res) => {
    const { childId, slots } = req.body;
    if (!childId) return res.status(400).json({ error: 'ChildId required' });

    // Verify ownership
    const child = await prisma.child.findFirst({
        where: { id: childId, userId: (req as any).user!.id } as any
    });
    if (!child) return res.status(403).json({ error: 'Unauthorized' });

    try {
        const slotIds = slots.filter((s: any) => s.id).map((s: any) => s.id);

        // 1. Delete slots that are not in the new list
        const deleteOp = prisma.timeSlot.deleteMany({
            where: {
                childId,
                id: { notIn: slotIds }
            }
        });

        // 2. Upsert (Create or Update) all slots in the new list
        const upsertOps = slots.map((slot: any) => {
            const data = {
                childId,
                dayIndex: slot.dayIndex,
                startTime: slot.startTime,
                durationMinutes: slot.durationMinutes,
                activity: slot.activity,
                type: slot.type,
                status: slot.status
            };

            // Ensure we use the provided ID if available (for stability)
            // If it's a new slot from frontend with UUID, we definitely want to use that ID.
            if (slot.id) {
                return prisma.timeSlot.upsert({
                    where: { id: slot.id as string },
                    update: { ...data, updatedAt: new Date() },
                    create: { ...data, id: slot.id as string } // Use the provided ID!
                });
            } else {
                // Fallback for missing ID (shouldn't happen with updated frontend)
                return prisma.timeSlot.create({ data });
            }
        });

        const result = await prisma.$transaction([deleteOp, ...upsertOps]);
        res.json(result);
    } catch (error) {
        console.error("Batch save error:", error);
        res.status(500).json({ error: 'Failed to save batch schedules' });
    }
});

app.delete('/api/schedules/:id', authenticateToken, async (req: AuthRequest, res) => {
    try {
        // Need to find if slot belongs to a child of this user
        const slot = await prisma.timeSlot.findUnique({
            where: { id: req.params.id as string },
            include: { child: true }
        });

        if (!slot || (slot.child as any).userId !== (req as any).user!.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        await prisma.timeSlot.delete({ where: { id: req.params.id as string } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete schedule slot' });
    }
});

app.delete('/api/schedules/all/:childId', authenticateToken, async (req: AuthRequest, res) => {
    const childId = req.params.childId as string;
    try {
        // Verify ownership
        const child = await prisma.child.findFirst({
            where: { id: childId, userId: (req as any).user!.id } as any
        });
        if (!child) return res.status(403).json({ error: 'Unauthorized' });

        await prisma.timeSlot.deleteMany({ where: { childId } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to clear schedule' });
    }
});

// --- Logs & Points (Protected) ---

app.get('/api/logs', authenticateToken, async (req: AuthRequest, res) => {
    const childId = req.query.childId as string | undefined;
    if (!childId) return res.status(400).json([]);

    const child = await prisma.child.findFirst({
        where: { id: childId, userId: (req as any).user!.id } as any
    });
    if (!child) return res.status(403).json({ error: 'Unauthorized' });

    try {
        const logs = await prisma.pointUsageLog.findMany({
            where: { childId },
            orderBy: { timestamp: 'desc' },
            take: 50
        });
        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: 'Failed logs' });
    }
});

app.post('/api/logs', authenticateToken, async (req: AuthRequest, res) => {
    const { childId, amount, reason } = req.body;

    const child = await prisma.child.findFirst({
        where: { id: childId, userId: (req as any).user!.id } as any
    });
    if (!child) return res.status(403).json({ error: 'Unauthorized' });

    try {
        const log = await prisma.pointUsageLog.create({
            data: { childId, amount, reason, timestamp: new Date() }
        });
        res.json(log);
    } catch (error) { }
});

app.post('/api/logs/reset', authenticateToken, async (req: AuthRequest, res) => {
    const childId = req.body.childId as string | undefined;

    const child = await prisma.child.findFirst({
        where: { id: childId, userId: (req as any).user!.id } as any
    });
    if (!child) return res.status(403).json({ error: 'Unauthorized' });

    try {
        await prisma.pointUsageLog.deleteMany({ where: { childId } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed reset logs' });
    }
});

// --- Reward Config (Protected) ---

app.get('/api/rewards/:childId', authenticateToken, async (req: AuthRequest, res) => {
    const childId = req.params.childId as string;
    const child = await prisma.child.findFirst({
        where: { id: childId, userId: (req as any).user!.id } as any
    });
    if (!child) return res.status(403).json({ error: 'Unauthorized' });

    try {
        const config = await prisma.rewardConfig.findUnique({
            where: { childId: childId }
        });
        res.json(config || {});
    } catch (e) {
        res.status(500).json({ error: 'Failed fetch config' });
    }
});

app.put('/api/rewards/:childId', authenticateToken, async (req: AuthRequest, res) => {
    const childId = req.params.childId as string;
    const child = await prisma.child.findFirst({
        where: { id: childId, userId: (req as any).user!.id } as any
    });
    if (!child) return res.status(403).json({ error: 'Unauthorized' });

    const { mode, unit, study, academy, school, routine, rest, sleep } = req.body;

    try {
        const config = await prisma.rewardConfig.upsert({
            where: { childId: childId },
            update: { mode, unit, study, academy, school, routine, rest, sleep } as any,
            create: { childId, mode, unit, study, academy, school, routine, rest, sleep } as any
        });
        res.json(config);
    } catch (e) {
        res.status(500).json({ error: 'Failed update config' });
    }
});

// --- Admin & Global Config API ---

// Public Config (for Frontend)
app.get('/api/public/config', async (req, res) => {
    try {
        const configs = await (prisma as any).appConfig.findMany();
        const configMap: Record<string, string> = {};
        configs.forEach((c: any) => {
            configMap[c.key] = c.value;
        });
        res.json(configMap);
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch config' });
    }
});

// Admin Update Config (Protected by simple password)
app.post('/api/admin/config', async (req, res) => {
    const { password, settings } = req.body;

    // Simple hardcoded admin password for now
    if (password !== 'admin1234') {
        return res.status(401).json({ error: 'Invalid admin password' });
    }

    try {
        const operations = Object.entries(settings).map(([key, value]) => {
            return (prisma as any).appConfig.upsert({
                where: { key },
                update: { value: String(value) },
                create: { key, value: String(value) }
            });
        });
        await prisma.$transaction(operations);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed to update config' });
    }
});

// --- User Premium API ---

app.get('/api/user/me', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const user = await (prisma as any).user.findUnique({
            where: { id: (req as any).user!.id }
        });
        if (!user) return res.status(404).json({ error: 'User not found' });

        res.json({
            id: user.id,
            email: user.email,
            isPremium: !!user.isPremium,
            premiumExpiry: user.premiumExpiry
        });
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch user info' });
    }
});

app.post('/api/user/premium', authenticateToken, async (req: AuthRequest, res) => {
    try {
        // Mock payment verification - instantly upgrade
        await (prisma as any).user.update({
            where: { id: (req as any).user!.id },
            data: { isPremium: true, premiumExpiry: null } // Lifetime or managed externally
        });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed to upgrade premium' });
    }
});

// Serve Static Files in Production
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// Catch-all to serve index.html for frontend routing
app.use((req, res) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'API route not found' });
    }
    res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
