import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { prisma } from '../../config/database';
import { v4 as uuidv4 } from 'uuid';

export const clientRoutes = Router();
clientRoutes.use(authenticate);

// Initial default clients seeded in memory/DB
let inMemoryClients = [
  {
    id: 'cli-001',
    name: 'PNG Road Construction Test Client',
    code: 'PNG-RC',
    contactPerson: 'David Kila',
    email: 'info@pngroadconstruction.com.pg',
    phone: '+675 325 1100',
    address: 'Section 45, Allotment 12, Spring Garden Rd, Port Moresby, NCD',
    clientType: 'Contractor',
    activeProjects: 3,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cli-002',
    name: 'Department of Works - Major Projects Division',
    code: 'DOW-MPD',
    contactPerson: 'Kila Morea',
    email: 'kmorea@dow.gov.pg',
    phone: '+675 324 1200',
    address: 'DoW Headquarters, Boroko, Port Moresby',
    clientType: 'Government',
    activeProjects: 5,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cli-003',
    name: 'China Railway Construction Group (PNG)',
    code: 'CRCG',
    contactPerson: 'Wang Lin',
    email: 'contact@crcg-png.com',
    phone: '+675 321 8800',
    address: 'Highlands Highway Upgrade Compound, Mt Hagen',
    clientType: 'Contractor',
    activeProjects: 2,
    createdAt: new Date().toISOString(),
  },
];

// GET /api/v1/clients
clientRoutes.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search } = req.query;
    // Also discover any distinct clients recorded in projects
    const dbProjects = await prisma.project.findMany({ select: { client: true } });
    const existingNames = new Set(inMemoryClients.map((c) => c.name.toLowerCase()));

    for (const p of dbProjects) {
      if (p.client && !existingNames.has(p.client.toLowerCase())) {
        existingNames.add(p.client.toLowerCase());
        inMemoryClients.push({
          id: `cli-${uuidv4().substring(0, 8)}`,
          name: p.client,
          code: p.client.substring(0, 4).toUpperCase(),
          contactPerson: 'Project Liaison',
          email: 'office@client.gov.pg',
          phone: '+675 320 0000',
          address: 'Port Moresby, Papua New Guinea',
          clientType: 'Corporate',
          activeProjects: 1,
          createdAt: new Date().toISOString(),
        });
      }
    }

    let result = inMemoryClients;
    if (search) {
      const q = String(search).toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.contactPerson.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q)
      );
    }

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/clients
clientRoutes.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, code, contactPerson, email, phone, address, clientType } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: { message: 'Client name is required' } });
    }

    const newClient = {
      id: `cli-${uuidv4().substring(0, 8)}`,
      name,
      code: code || name.substring(0, 4).toUpperCase(),
      contactPerson: contactPerson || 'Authorized Representative',
      email: email || '',
      phone: phone || '',
      address: address || 'Papua New Guinea',
      clientType: clientType || 'Contractor',
      activeProjects: 0,
      createdAt: new Date().toISOString(),
    };

    inMemoryClients.unshift(newClient);
    res.status(201).json({ success: true, data: newClient });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/clients/:id
clientRoutes.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const client = inMemoryClients.find((c) => c.id === req.params.id || c.name === req.params.id);
    if (!client) {
      return res.status(404).json({ success: false, error: { message: 'Client not found' } });
    }
    res.json({ success: true, data: client });
  } catch (error) {
    next(error);
  }
});

