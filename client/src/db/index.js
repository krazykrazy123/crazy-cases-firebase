import Dexie from 'dexie';

const db = new Dexie('CrazyCasesDB');

db.version(1).stores({
  users: 'id, username, stars_balance, balanceTON, createdAt',
  pvp_rounds: 'id, status, potTON, endTime, winner',
  bets: '++id, roundId, userId, username, amount, currency',
  matchmaking_queue: 'id, userId, timestamp'
});

export default db;