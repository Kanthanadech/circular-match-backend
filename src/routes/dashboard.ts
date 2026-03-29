import { Router, Request, Response } from 'express';
import { prisma } from '../utils/prisma';

const router = Router();

// GET /api/dashboard/stats?user_id=1
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const userId = req.query.user_id as string;
    if (!userId) {
      return res.status(400).json({ error: 'user_id required' });
    }

    const matchRows = await prisma.match.findMany({
  where: {
    OR: [
      { receiverId: userId },
      { waste: { generatorId: userId } },
    ],
  },
      include: {
        waste: true,
        receiver: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const matches_count           = matchRows.length;
    const total_waste_recycled_kg = matchRows.reduce((s, m) => s + (m.waste?.weightKg ?? 0), 0);
    const total_carbon_saved_raw  = matchRows.reduce((s, m) => s + (m.carbonSavedKg ?? 0), 0);
    const saved_thb               = total_waste_recycled_kg * 20;

    const by_category: Record<string, number> = {};
    for (const m of matchRows) {
      const cat = m.waste?.category ?? 'Other';
      by_category[cat] = (by_category[cat] ?? 0) + (m.carbonSavedKg ?? 0);
    }

    const recent_matches = await Promise.all(
      matchRows.slice(0, 10).map(async (m) => {
        const generator = m.waste?.generatorId
          ? await prisma.user.findUnique({ where: { id: m.waste.generatorId } })
          : null;
        return {
          id:                m.id,
          waste_id:          m.wasteId,
          receiver_id:       m.receiverId,
          distance_km:       m.actualDistanceKm,
          carbon_saved_kg:   m.carbonSavedKg,
          waste_title:       m.waste?.title,
          category:          m.waste?.category,
          weight_kg:         m.waste?.weightKg,
          generator_company: generator?.companyName ?? 'ไม่ระบุ',
          receiver_company:  m.receiver?.companyName ?? 'ไม่ระบุ',
          created_at:        m.createdAt,
        };
      })
    );

    res.json({
      user_id:               userId,
      matches_count,
      total_waste_recycled_kg,
      total_carbon_saved_kg: parseFloat(total_carbon_saved_raw.toFixed(2)),
      saved_thb,
      by_category,
      recent_matches,
    });
  } catch (err: any) {
    console.error('dashboard/stats error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;