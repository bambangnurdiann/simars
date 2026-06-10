import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Default password for all seeded users
const DEFAULT_PASSWORD = 'pasarwajo123';

interface SeedUser {
  username: string;
  name: string;
  role: string;
}

const users: SeedUser[] = [
  { username: 'kamaruddin',         name: 'M. Kamaruddin Amri, S.H.',          role: 'PIMPINAN' },
  { username: 'aris.saifudin',      name: 'Aris Saifudin, S.Sy., M.H.',        role: 'HAKIM' },
  { username: 'shally.rasyida',     name: 'Shally Nur Rasyida, S.H., M.SEI.',  role: 'HAKIM' },
  { username: 'waode.nurhaisa',     name: 'Dra. Waode Nurhaisa',               role: 'PANITERA' },
  { username: 'nazmah.saiful',      name: 'A. Nazmah Saiful, S.Kom.',          role: 'SEKRETARIS' },
  { username: 'azwar.tanda',        name: 'Laode Azwar Tanda, S.H.',           role: 'PANITERA_MUDA_PERMOHONAN' },
  { username: 'abdul.rusmin',       name: 'La Ode Abdul Rusmin, S.H.',         role: 'PANITERA_MUDA_GUGATAN' },
  { username: 'rehadis.tofa',       name: 'Muhammad Rehadis Tofa, S.H.',       role: 'PANITERA_MUDA_HUKUM' },
  { username: 'syukri',             name: 'Syukri, S.Si.',                     role: 'KEPALA_SUB_PTIP' },
  { username: 'bustamin.usmar',     name: 'Bustamin Usmar, S.E.',              role: 'KEPALA_SUB_KEPEGAWAIAN' },
  { username: 'junaid',             name: 'Junaid, S.H.',                      role: 'KEPALA_SUB_UMUM' },
  { username: 'elgi.hikmat',        name: 'Elgi Hikmat Syafi, S.H.',           role: 'STAFF' },
  { username: 'bambang.nurdiansyah',name: 'Bambang Nurdiansyah, A.Md.T.',      role: 'STAFF' },
  { username: 'annisa.rahmawati',   name: 'Annisa Rahmawati Wardani, A.Md.Pik.', role: 'STAFF' },
  { username: 'rini.puspitasari',   name: 'Rini Puspitasari, A.Md.',           role: 'STAFF' },
  { username: 'alfin.fatih',        name: 'Muhammad Alfin Fatih, S.H.',        role: 'STAFF' },
  { username: 'diffa.pratama',      name: 'Maulana Diffa Pratama, S.H.',       role: 'STAFF' },
  { username: 'ulfiah.hasnawir',    name: 'Ulfiah Hasnawir, S.H.',             role: 'STAFF' },
  { username: 'agus',               name: 'Agus, S.E.',                        role: 'STAFF' },
  { username: 'birman',             name: 'Birman, S.Pd.',                     role: 'STAFF' },
  { username: 'alfian.husnil',      name: 'Andi Alfian Husnil, S.H.',          role: 'STAFF' },
  { username: 'virgiyawan',         name: 'Virgiyawan Listiyanto Datau, S.T.', role: 'STAFF' },
  { username: 'mersi',              name: 'Mersi, S.Pi.',                      role: 'STAFF' },
  { username: 'firman',             name: 'Firman, S.Pd.I.',                   role: 'STAFF' },
  { username: 'husni',              name: 'Husni',                             role: 'STAFF' },
  { username: 'achmad.feriyanto',   name: 'Achmad Feriyanto, A.Md.A.B.',       role: 'STAFF' },
  { username: 'andiar.agung',       name: 'Andiar Agung Syah Putra, S.Kom.',   role: 'STAFF' },
  { username: 'bakri.subu',         name: 'Bakri Subu',                        role: 'STAFF' },
];

const supervisorMap: Record<string, string[]> = {
  'kamaruddin':      ['waode.nurhaisa', 'nazmah.saiful', 'bakri.subu'],
  'waode.nurhaisa':  ['azwar.tanda', 'abdul.rusmin', 'rehadis.tofa'],
  'nazmah.saiful':   ['syukri', 'bustamin.usmar', 'junaid'],
  'abdul.rusmin':    ['annisa.rahmawati', 'rini.puspitasari', 'bambang.nurdiansyah'],
  'rehadis.tofa':    ['alfin.fatih', 'elgi.hikmat', 'diffa.pratama', 'ulfiah.hasnawir'],
  'syukri':          ['agus', 'achmad.feriyanto', 'andiar.agung'],
  'bustamin.usmar':  ['birman', 'alfian.husnil'],
  'junaid':          ['virgiyawan', 'mersi', 'firman', 'husni'],
};

async function main() {
  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  console.log('=== PASS 1: Inserting all users without supervisorId ===');

  for (const user of users) {
    await prisma.user.upsert({
      where: { username: user.username },
      update: {
        name: user.name,
        role: user.role,
        password: hashedPassword,
      },
      create: {
        username: user.username,
        password: hashedPassword,
        name: user.name,
        role: user.role,
      },
    });
    console.log('  OK ' + user.username + ' (' + user.role + ')');
  }

  console.log(users.length + ' users upserted.');

  console.log('=== PASS 2: Updating supervisorId hierarchy ===');

  const allUsers = await prisma.user.findMany({
    where: { username: { in: users.map(u => u.username) } },
  });

  const userMap = new Map<string, string>();
  for (const u of allUsers) {
    userMap.set(u.username, u.id);
  }

  await prisma.user.updateMany({
    where: { username: { in: users.map(u => u.username) } },
    data: { supervisorId: null },
  });

  for (const [supervisorUsername, subordinates] of Object.entries(supervisorMap)) {
    const supervisorId = userMap.get(supervisorUsername);
    if (!supervisorId) { console.log('WARN: ' + supervisorUsername + ' not found'); continue; }
    for (const sub of subordinates) {
      const subId = userMap.get(sub);
      if (!subId) { console.log('WARN: ' + sub + ' not found'); continue; }
      await prisma.user.update({ where: { id: subId }, data: { supervisorId } });
      console.log('  ' + sub + ' -> ' + supervisorUsername);
    }
  }

  console.log('Top-level/independent: kamaruddin, aris.saifudin, shally.rasyida');
  console.log('Supervisor hierarchy updated.');
  console.log('Total users: ' + (await prisma.user.count()));
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
