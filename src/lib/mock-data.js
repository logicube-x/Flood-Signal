// SAMPLE DATA ONLY - DO NOT USE FOR ACTUAL EMERGENCY RESPONSE
export const VADODARA_CENTER = [22.3072, 73.1812];

const NOW = Date.now();
const ONE_HOUR = 60 * 60 * 1000;

export const INITIAL_MOCK_INCIDENTS = [
  {
    id: 'sample-001',
    title: 'Alkapuri Underpass Flooded',
    lat: 22.3106,
    lng: 73.1678,
    depth: 60,
    time: '15 mins ago',
    timestamp: NOW - (15 * 60 * 1000),
    severity: 'high',
    roadBlocked: true,
    criticalFacility: false,
    status: 'Pending Crew',
    verified: true,
    isSample: true,
  },
  {
    id: 'sample-002',
    title: 'Waterlogging at Sayaji Baug Circle',
    lat: 22.3145,
    lng: 73.1901,
    depth: 25,
    time: '45 mins ago',
    timestamp: NOW - (45 * 60 * 1000),
    severity: 'medium',
    roadBlocked: false,
    criticalFacility: false,
    status: 'Investigating',
    verified: false,
    isSample: true,
  },
  {
    id: 'sample-003',
    title: 'Gotri Road Minor Ponding (Stale)',
    lat: 22.3168,
    lng: 73.1492,
    depth: 10,
    time: '8 hours ago',
    timestamp: NOW - (8 * ONE_HOUR), // >6 hours, should be marked stale
    severity: 'low',
    roadBlocked: false,
    criticalFacility: false,
    status: 'Monitoring',
    verified: true,
    isSample: true,
  },
  {
    id: 'sample-004',
    title: 'Vishwamitri Bridge Approach Critical Water',
    lat: 22.2885,
    lng: 73.1865,
    depth: 110,
    time: '10 mins ago',
    timestamp: NOW - (10 * 60 * 1000),
    severity: 'critical',
    roadBlocked: true,
    criticalFacility: true,
    status: 'En Route',
    verified: true,
    isSample: true,
  }
];

// TEMPORARY MOCK SERVICE
export async function mockSubmitIncident(data) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() < 0.1) {
        reject(new Error("Network timeout: Unable to reach dispatch service."));
      } else {
        const newIncident = {
          ...data,
          id: `rep-${Math.floor(Math.random() * 10000)}`,
          time: 'Just now',
          timestamp: Date.now(),
          status: 'Pending Dispatch',
          verified: false,
          isSample: false
        };
        resolve(newIncident);
      }
    }, 1200);
  });
}
