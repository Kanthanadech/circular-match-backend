// seed-wastes.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');
  await prisma.match.deleteMany();
  await prisma.waste.deleteMany();
  await prisma.user.deleteMany();
  console.log('Cleared existing data');

  const pw = await bcrypt.hash('demo1234', 10);
  const users = await Promise.all([
    prisma.user.create({ data: { email: 'arabica@demo.com', passwordHash: pw, companyName: 'โรงคั่วกาแฟ Arabica ดอยช้าง', role: 'GENERATOR', lat: 13.7563, lng: 100.5018 } }),
    prisma.user.create({ data: { email: 'farm@demo.com', passwordHash: pw, companyName: 'ฟาร์มไส้เดือนสวนเกษตร', role: 'RECEIVER', lat: 13.8100, lng: 100.5500 } }),
    prisma.user.create({ data: { email: 'siam@demo.com', passwordHash: pw, companyName: 'โรงงานผลไม้สยามฟู้ด', role: 'GENERATOR', lat: 13.7300, lng: 100.6200 } }),
    prisma.user.create({ data: { email: 'mk@demo.com', passwordHash: pw, companyName: 'ร้าน MK สาขาลาดพร้าว', role: 'GENERATOR', lat: 13.8020, lng: 100.5700 } }),
    prisma.user.create({ data: { email: 'xyz@demo.com', passwordHash: pw, companyName: 'โรงงาน XYZ Packaging บางนา', role: 'GENERATOR', lat: 13.6500, lng: 100.6800 } }),
    prisma.user.create({ data: { email: 'biofarm@demo.com', passwordHash: pw, companyName: 'ฟาร์มปุ๋ยชีวภาพสมุทรปราการ', role: 'RECEIVER', lat: 13.5980, lng: 100.5940 } }),
    prisma.user.create({ data: { email: 'thelocal@demo.com', passwordHash: pw, companyName: 'ร้านอาหาร The Local Bangkok', role: 'GENERATOR', lat: 13.7250, lng: 100.5300 } }),
    prisma.user.create({ data: { email: 'sugar@demo.com', passwordHash: pw, companyName: 'โรงงานน้ำตาลไทย-จีน อยุธยา', role: 'GENERATOR', lat: 14.3522, lng: 100.5895 } }),
    prisma.user.create({ data: { email: 'organic@demo.com', passwordHash: pw, companyName: 'สวนผักอินทรีย์นนทบุรี', role: 'GENERATOR', lat: 13.8600, lng: 100.4800 } }),
    prisma.user.create({ data: { email: 'craft@demo.com', passwordHash: pw, companyName: 'โรงเบียร์คราฟต์ Bang Sue', role: 'GENERATOR', lat: 13.8050, lng: 100.5350 } }),
  ]);
  console.log('Created', users.length, 'users');

  const wastes = [
    { title: 'กากกาแฟสด', category: 'ORGANIC', weightKg: 120, generatorId: users[0].id, description: 'กากกาแฟจากต้ม ไม่มีสารเคมี เหมาะทำปุ๋ยหมักหรือขัดผิว' },
    { title: 'เปลือกส้มและผลไม้รวม', category: 'ORGANIC', weightKg: 340, generatorId: users[2].id, description: 'เปลือกจากแปรรูปน้ำผลไม้ มีปริมาณสูง' },
    { title: 'กากมะพร้าวแห้ง', category: 'ORGANIC', weightKg: 90, generatorId: users[2].id, description: 'กากมะพร้าวหลังสกัดน้ำมัน เหมาะทำดินปลูก' },
    { title: 'น้ำซุปเก่าร้านอาหาร', category: 'ORGANIC', weightKg: 150, generatorId: users[6].id, description: 'น้ำซุปไก่/หมู ใช้ทำปุ๋ยหมักหรืออาหารสัตว์' },
    { title: 'กากน้ำตาล Molasses', category: 'ORGANIC', weightKg: 500, generatorId: users[7].id, description: 'กากน้ำตาลจากการผลิต เหมาะทำอาหารสัตว์หรือปุ๋ย' },
    { title: 'ต้นผักเหลือทิ้ง', category: 'ORGANIC', weightKg: 200, generatorId: users[8].id, description: 'ต้นผักอินทรีย์ ใบและลำต้น เหมาะทำปุ๋ยหมัก' },
    { title: 'กากมอลต์จากเบียร์', category: 'ORGANIC', weightKg: 300, generatorId: users[9].id, description: 'กากมอลต์หลังผลิตเบียร์ โปรตีนสูง เหมาะทำอาหารสัตว์' },
    { title: 'เศษอาหารจากร้านอาหาร', category: 'ORGANIC', weightKg: 80, generatorId: users[6].id, description: 'เศษผักผลไม้จากครัว เหมาะทำปุ๋ยหมัก' },
    { title: 'กากถั่วเหลืองจากโรงงาน', category: 'ORGANIC', weightKg: 400, generatorId: users[7].id, description: 'กากถั่วเหลืองหลังสกัดน้ำมัน โปรตีนสูง' },
    { title: 'เปลือกสับปะรดจากโรงงาน', category: 'ORGANIC', weightKg: 250, generatorId: users[2].id, description: 'เปลือกสับปะรดจากการแปรรูป เหมาะทำเอนไซม์' },
    { title: 'กากข้าวโพดหมัก', category: 'ORGANIC', weightKg: 600, generatorId: users[7].id, description: 'กากข้าวโพดหลังหมัก เหมาะทำอาหารสัตว์' },
    { title: 'เปลือกกล้วยจากโรงงาน', category: 'ORGANIC', weightKg: 180, generatorId: users[2].id, description: 'เปลือกกล้วยแห้ง เหมาะทำปุ๋ยโพแทสเซียม' },
    { title: 'พาเลทไม้เก่า', category: 'WOOD', weightKg: 200, generatorId: users[4].id, description: 'พาเลทไม้ยังแข็งแรง เหมาะทำเฟอร์นิเจอร์หรือปลูกต้นไม้' },
    { title: 'เศษไม้จากโรงงาน', category: 'WOOD', weightKg: 600, generatorId: users[4].id, description: 'เศษไม้ยูคาลิปตัส เหมาะทำเชื้อเพลิงชีวมวล' },
    { title: 'ขี้เลื่อยไม้สัก', category: 'WOOD', weightKg: 300, generatorId: users[7].id, description: 'ขี้เลื่อยจากการแปรรูปไม้ เหมาะทำเห็ดหรือปุ๋ย' },
    { title: 'กิ่งไม้ตัดแต่งจากสวน', category: 'WOOD', weightKg: 400, generatorId: users[8].id, description: 'กิ่งไม้จากสวนอินทรีย์ เหมาะทำถ่านชีวภาพ' },
    { title: 'แกลบข้าวจากโรงสี', category: 'WOOD', weightKg: 1000, generatorId: users[7].id, description: 'แกลบข้าวแห้ง เหมาะทำเชื้อเพลิงหรือวัสดุปลูก' },
    { title: 'น้ำมันทอดซ้ำ', category: 'OIL', weightKg: 80, generatorId: users[3].id, description: 'น้ำมันปาล์มทอดซ้ำ เหมาะทำ Biodiesel หรือสบู่' },
    { title: 'น้ำมันหมูจากร้านอาหาร', category: 'OIL', weightKg: 45, generatorId: users[6].id, description: 'น้ำมันหมูใช้แล้ว เหมาะทำ Biodiesel' },
    { title: 'น้ำมันพืชจากครัวร้าน', category: 'OIL', weightKg: 120, generatorId: users[3].id, description: 'น้ำมันพืชใช้แล้ว เกรดอาหาร เหมาะทำ Biodiesel' },
    { title: 'น้ำมันปาล์มดิบเกรด B', category: 'OIL', weightKg: 500, generatorId: users[7].id, description: 'น้ำมันปาล์มดิบจากกระบวนการผลิต' },
    { title: 'ไขมันสัตว์จากโรงงาน', category: 'OIL', weightKg: 200, generatorId: users[2].id, description: 'ไขมันสัตว์จากกระบวนการแปรรูปอาหาร' },
    { title: 'ฟิล์มพลาสติก PE', category: 'PLASTIC', weightKg: 80, generatorId: users[4].id, description: 'ฟิล์มพลาสติกใสจากบรรจุภัณฑ์ รีไซเคิลได้' },
    { title: 'กล่องพลาสติก PP', category: 'PLASTIC', weightKg: 60, generatorId: users[2].id, description: 'กล่องพลาสติก PP ใสสะอาด รีไซเคิลได้' },
    { title: 'ขวดพลาสติก PET', category: 'PLASTIC', weightKg: 200, generatorId: users[3].id, description: 'ขวดน้ำดื่ม PET ใสสะอาด เกรดรีไซเคิล' },
    { title: 'ถุงพลาสติก HDPE', category: 'PLASTIC', weightKg: 150, generatorId: users[6].id, description: 'ถุงพลาสติกสะอาด เหมาะรีไซเคิล' },
    { title: 'ขวดแก้วเบียร์', category: 'PLASTIC', weightKg: 300, generatorId: users[9].id, description: 'ขวดแก้วสะอาด นำกลับมาใช้ใหม่ได้' },
    { title: 'กระป๋องอลูมิเนียม', category: 'PLASTIC', weightKg: 100, generatorId: users[9].id, description: 'กระป๋องเบียร์อลูมิเนียม มูลค่าสูง' },
    { title: 'โฟม EPS จากบรรจุภัณฑ์', category: 'PLASTIC', weightKg: 50, generatorId: users[4].id, description: 'โฟมกันกระแทก EPS จากสินค้า' },
    { title: 'กระดาษบรรจุภัณฑ์กาแฟ', category: 'PAPER', weightKg: 60, generatorId: users[0].id, description: 'กระดาษลูกฟูกจากกล่องกาแฟ' },
    { title: 'กล่องกระดาษลูกฟูก', category: 'PAPER', weightKg: 400, generatorId: users[4].id, description: 'กล่องกระดาษลูกฟูกจากโรงงาน สะอาด' },
    { title: 'ถุงกระดาษกาแฟ', category: 'PAPER', weightKg: 30, generatorId: users[0].id, description: 'ถุงกระดาษบรรจุกาแฟ เหมาะทำกระดาษรีไซเคิล' },
    { title: 'กระดาษหนังสือพิมพ์เก่า', category: 'PAPER', weightKg: 500, generatorId: users[6].id, description: 'หนังสือพิมพ์เก่า เหมาะทำกระดาษรีไซเคิล' },
    { title: 'กระดาษออฟฟิศใช้แล้ว', category: 'PAPER', weightKg: 200, generatorId: users[3].id, description: 'กระดาษ A4 ใช้แล้ว เหมาะรีไซเคิล' },
    { title: 'กล่องนมและเครื่องดื่ม', category: 'PAPER', weightKg: 80, generatorId: users[3].id, description: 'กล่องนม UHT และเครื่องดื่ม เหมาะรีไซเคิล' },
    { title: 'กระดาษลูกฟูกจากตลาด', category: 'PAPER', weightKg: 600, generatorId: users[2].id, description: 'กระดาษลูกฟูกจากกล่องผักผลไม้ สะอาด' },
    { title: 'แกนกระดาษทิชชู', category: 'PAPER', weightKg: 40, generatorId: users[3].id, description: 'แกนกระดาษทิชชู รีไซเคิลได้' },
    { title: 'กล่องกระดาษเบียร์', category: 'PAPER', weightKg: 120, generatorId: users[9].id, description: 'กล่องกระดาษบรรจุเบียร์ เหมาะรีไซเคิล' },
  ];

  let count = 0;
  for (const w of wastes) {
    await prisma.waste.create({
      data: {
        title: w.title,
        category: w.category,
        weightKg: w.weightKg,
        generatorId: w.generatorId,
        description: w.description,
        status: 'AVAILABLE',
      }
    });
    count++;
    process.stdout.write(`\r  Creating waste ${count}/${wastes.length}...`);
  }
  console.log('\nCreated', count, 'waste items');
  console.log('Seed complete!');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
