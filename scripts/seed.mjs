/**
 * Seed script for AF Tracker locations.
 * Requires SUPABASE_SERVICE_ROLE_KEY environment variable.
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=<your-key> node scripts/seed.mjs
 *
 * Get your service role key from:
 *   https://supabase.com/dashboard/project/htorrrknltwnfmnihtgf/settings/api
 *   (Project Settings → API → service_role secret)
 *
 * Alternative: run scripts/setup.sql in the Supabase SQL Editor instead.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://htorrrknltwnfmnihtgf.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable is required.');
  console.error('Get it from: https://supabase.com/dashboard/project/htorrrknltwnfmnihtgf/settings/api');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const locations = [
  // CENTRAL SINGAPORE
  { name: 'Ang Mo Kio Hub', address: '53 Ang Mo Kio Ave 3 #03-38, Singapore 569933', lat: 1.3694, lng: 103.8454, country: 'SG', region: 'Central', is_24h: true },
  { name: 'Balestier - 288', address: '288 Balestier Road #02-01, Singapore 329730', lat: 1.3245, lng: 103.8497, country: 'SG', region: 'Central', is_24h: true },
  { name: 'Bishan - Junction 8', address: '9 Bishan Place #B1-01, Singapore 579837', lat: 1.3508, lng: 103.8487, country: 'SG', region: 'Central', is_24h: true },
  { name: 'Braddell - Thomson Plaza', address: '301 Upper Thomson Road #03-26, Singapore 574408', lat: 1.3588, lng: 103.8352, country: 'SG', region: 'Central', is_24h: true },
  { name: 'Bukit Timah - Beauty World Centre', address: '144 Upper Bukit Timah Road #B2-01, Singapore 588177', lat: 1.3421, lng: 103.7762, country: 'SG', region: 'Central', is_24h: true },
  { name: 'Bugis+', address: '201 Victoria Street #05-01, Singapore 188067', lat: 1.2999, lng: 103.8552, country: 'SG', region: 'Central', is_24h: true },
  { name: 'City Hall - Peninsula Plaza', address: '111 North Bridge Road #B1-02, Singapore 179098', lat: 1.2929, lng: 103.8508, country: 'SG', region: 'Central', is_24h: true },
  { name: 'MacPherson - Poiz Centre', address: '51 Upper Serangoon Road #04-01, Singapore 347697', lat: 1.3265, lng: 103.8818, country: 'SG', region: 'Central', is_24h: true },
  { name: 'Novena - United Square', address: '101 Thomson Road #B1-18, Singapore 307591', lat: 1.3201, lng: 103.8434, country: 'SG', region: 'Central', is_24h: true },
  { name: 'Novena - Velocity', address: '238 Thomson Road #04-01, Singapore 307683', lat: 1.3205, lng: 103.8447, country: 'SG', region: 'Central', is_24h: true },
  { name: 'Orchard - Lucky Plaza', address: '304 Orchard Road #05-13, Singapore 238863', lat: 1.3033, lng: 103.8334, country: 'SG', region: 'Central', is_24h: true },
  { name: 'Plaza Singapura - Dhoby Ghaut', address: '68 Orchard Road #05-01, Singapore 238839', lat: 1.3009, lng: 103.8456, country: 'SG', region: 'Central', is_24h: true },
  { name: 'Paya Lebar Square', address: '60 Paya Lebar Road #04-35, Singapore 409051', lat: 1.3182, lng: 103.8921, country: 'SG', region: 'Central', is_24h: true },
  { name: 'Suntec City', address: '3 Temasek Boulevard #03-328, Singapore 038983', lat: 1.2942, lng: 103.8580, country: 'SG', region: 'Central', is_24h: true },
  { name: 'Tiong Bahru Plaza', address: '302 Tiong Bahru Road #04-94, Singapore 168732', lat: 1.2855, lng: 103.8268, country: 'SG', region: 'Central', is_24h: true },
  { name: 'Toa Payoh - HDB Hub', address: '480 Lorong 6 Toa Payoh #01-08, Singapore 310480', lat: 1.3343, lng: 103.8524, country: 'SG', region: 'Central', is_24h: true },
  { name: 'VIIO @ Balestier', address: '2 Balestier Road #01-27, Singapore 320002', lat: 1.3254, lng: 103.8516, country: 'SG', region: 'Central', is_24h: true },
  { name: 'Great World City', address: '1 Kim Seng Promenade #B1-143, Singapore 237994', lat: 1.2921, lng: 103.8328, country: 'SG', region: 'Central', is_24h: true },
  { name: 'Harbourfront - VivoCity', address: '1 HarbourFront Walk #03-09, Singapore 098585', lat: 1.2644, lng: 103.8222, country: 'SG', region: 'Central', is_24h: true },
  { name: 'Serangoon - NEX', address: '23 Serangoon Central #04-28, Singapore 556083', lat: 1.3501, lng: 103.8730, country: 'SG', region: 'Central', is_24h: true },

  // NORTH EAST
  { name: 'Compass One - Sengkang', address: '1 Sengkang Square #04-01, Singapore 545078', lat: 1.3917, lng: 103.8953, country: 'SG', region: 'North East', is_24h: true },
  { name: 'Hougang Mall', address: '90 Hougang Avenue 10 #04-01, Singapore 538766', lat: 1.3722, lng: 103.8927, country: 'SG', region: 'North East', is_24h: true },
  { name: 'Kovan', address: '206 Hougang Street 21 #01-56, Singapore 530206', lat: 1.3620, lng: 103.8868, country: 'SG', region: 'North East', is_24h: true },
  { name: 'Punggol - Waterway Point', address: '83 Punggol Central #03-01, Singapore 828761', lat: 1.4058, lng: 103.9024, country: 'SG', region: 'North East', is_24h: true },
  { name: 'Punggol - Oasis Terraces', address: '681 Punggol Drive #04-01, Singapore 820681', lat: 1.4025, lng: 103.9068, country: 'SG', region: 'North East', is_24h: true },
  { name: 'Tampines - Century Square', address: '2 Tampines Central 5 #03-28, Singapore 529509', lat: 1.3527, lng: 103.9450, country: 'SG', region: 'North East', is_24h: true },
  { name: 'Tampines Mall', address: '4 Tampines Central 5 #04-04, Singapore 529510', lat: 1.3528, lng: 103.9454, country: 'SG', region: 'North East', is_24h: true },
  { name: 'Tampines - Our Tampines Hub', address: '1 Tampines Walk #04-33, Singapore 528523', lat: 1.3529, lng: 103.9406, country: 'SG', region: 'North East', is_24h: true },
  { name: 'Hougang - Kang Kar Mall', address: '1 Hougang Avenue 3 #04-01, Singapore 538813', lat: 1.3638, lng: 103.8893, country: 'SG', region: 'North East', is_24h: true },
  { name: 'Pasir Ris - White Sands', address: '1 Pasir Ris Central Street 3 #04-01, Singapore 518457', lat: 1.3726, lng: 103.9493, country: 'SG', region: 'North East', is_24h: true },

  // NORTH WEST
  { name: 'Bukit Batok - West Mall', address: '1 Bukit Batok Central Link #03-01, Singapore 658713', lat: 1.3483, lng: 103.7496, country: 'SG', region: 'North West', is_24h: true },
  { name: 'Bukit Panjang Plaza', address: '1 Jelebu Road #B1-01, Singapore 677743', lat: 1.3795, lng: 103.7657, country: 'SG', region: 'North West', is_24h: true },
  { name: 'Canberra Plaza', address: '133 Canberra View #02-20, Singapore 750133', lat: 1.4434, lng: 103.8202, country: 'SG', region: 'North West', is_24h: true },
  { name: 'Causeway Point - Woodlands', address: '1 Woodlands Square #04-01, Singapore 738099', lat: 1.4361, lng: 103.7861, country: 'SG', region: 'North West', is_24h: true },
  { name: 'Choa Chu Kang - Lot One', address: '21 Choa Chu Kang Avenue 4 #04-12, Singapore 689812', lat: 1.3852, lng: 103.7449, country: 'SG', region: 'North West', is_24h: true },
  { name: 'Northpoint City - Yishun', address: '930 Yishun Avenue 2 #04-28, Singapore 769098', lat: 1.4285, lng: 103.8354, country: 'SG', region: 'North West', is_24h: true },
  { name: 'Sun Plaza - Sembawang', address: '30 Sembawang Drive #04-01, Singapore 757713', lat: 1.4496, lng: 103.8200, country: 'SG', region: 'North West', is_24h: true },
  { name: 'Teck Whye - Choa Chu Kang', address: '9 Teck Whye Lane #01-01, Singapore 688195', lat: 1.3736, lng: 103.7567, country: 'SG', region: 'North West', is_24h: true },
  { name: 'Woodlands - Civic Centre', address: '900 South Woodlands Drive #02-01, Singapore 730900', lat: 1.4362, lng: 103.7862, country: 'SG', region: 'North West', is_24h: true },
  { name: 'Yishun - Junction Nine', address: '18 Yishun Avenue 9 #02-56, Singapore 768897', lat: 1.4243, lng: 103.8413, country: 'SG', region: 'North West', is_24h: true },
  { name: 'Bukit Timah - The Rail Mall', address: '396 Upper Bukit Timah Road #01-01, Singapore 678048', lat: 1.3578, lng: 103.7698, country: 'SG', region: 'North West', is_24h: true },

  // SOUTH EAST
  { name: 'Bedok Mall', address: '311 New Upper Changi Road #04-08, Singapore 467360', lat: 1.3241, lng: 103.9299, country: 'SG', region: 'South East', is_24h: true },
  { name: 'Changi City Point', address: '5 Changi Business Park Central 1 #B1-27, Singapore 486017', lat: 1.3341, lng: 103.9636, country: 'SG', region: 'South East', is_24h: true },
  { name: 'EastPoint Mall - Simei', address: '3 Simei Street 6 #03-38, Singapore 528833', lat: 1.3413, lng: 103.9494, country: 'SG', region: 'South East', is_24h: true },
  { name: 'Heartbeat @ Bedok', address: '11 Bedok North Street 1 #04-01, Singapore 469662', lat: 1.3250, lng: 103.9303, country: 'SG', region: 'South East', is_24h: true },
  { name: 'Loyang - Pasir Ris', address: '258 Pasir Ris Street 21 #02-01, Singapore 510258', lat: 1.3700, lng: 103.9750, country: 'SG', region: 'South East', is_24h: true },

  // SOUTH WEST
  { name: 'Clementi Mall', address: '3155 Commonwealth Avenue West #04-30, Singapore 129588', lat: 1.3148, lng: 103.7651, country: 'SG', region: 'South West', is_24h: true },
  { name: 'IMM - Jurong East', address: '2 Jurong East Street 21 #02-01, Singapore 609601', lat: 1.3337, lng: 103.7474, country: 'SG', region: 'South West', is_24h: true },
  { name: 'JEM - Jurong East', address: '50 Jurong Gateway Road #04-01, Singapore 608549', lat: 1.3333, lng: 103.7436, country: 'SG', region: 'South West', is_24h: true },
  { name: 'Jurong Point', address: '1 Jurong West Central 2 #02-K4, Singapore 648886', lat: 1.3399, lng: 103.7074, country: 'SG', region: 'South West', is_24h: true },
  { name: 'Rochester Mall - Dover', address: '35 Rochester Drive #02-01, Singapore 138639', lat: 1.3084, lng: 103.7877, country: 'SG', region: 'South West', is_24h: true },
  { name: 'Star Vista - Buona Vista', address: '1 Vista Exchange Green #01-01, Singapore 138617', lat: 1.3074, lng: 103.7882, country: 'SG', region: 'South West', is_24h: true },
  { name: 'Westgate - Jurong East', address: '3 Gateway Drive #04-01, Singapore 608532', lat: 1.3340, lng: 103.7432, country: 'SG', region: 'South West', is_24h: true },
  { name: 'Queensway - Alexandra', address: '1 Alexandra Road #01-01, Singapore 159964', lat: 1.2883, lng: 103.8022, country: 'SG', region: 'South West', is_24h: true },
  { name: 'Jurong West - Boon Lay', address: '221 Boon Lay Place #01-130, Singapore 640221', lat: 1.3458, lng: 103.7018, country: 'SG', region: 'South West', is_24h: true },
];

async function main() {
  console.log('Applying anon read policy for locations...');
  const { error: policyError } = await supabase.rpc('exec_sql', {
    sql: `
      DROP POLICY IF EXISTS "Locations are viewable by authenticated users" ON public.locations;
      DROP POLICY IF EXISTS "Locations are viewable by everyone" ON public.locations;
      CREATE POLICY "Locations are viewable by everyone"
        ON public.locations FOR SELECT TO anon, authenticated USING (true);
    `
  });

  if (policyError) {
    console.warn('Policy update via RPC not available. Apply scripts/setup.sql in Supabase SQL Editor instead.');
  }

  console.log(`Deleting existing SG locations...`);
  const { error: deleteError } = await supabase
    .from('locations')
    .delete()
    .eq('country', 'SG');

  if (deleteError) {
    console.error('Delete failed:', deleteError.message);
    process.exit(1);
  }

  console.log(`Inserting ${locations.length} locations...`);
  const { error: insertError, data } = await supabase
    .from('locations')
    .insert(locations)
    .select('id');

  if (insertError) {
    console.error('Insert failed:', insertError.message);
    process.exit(1);
  }

  console.log(`Successfully seeded ${data?.length ?? 0} locations.`);

  // Summary by region
  const { data: summary } = await supabase
    .from('locations')
    .select('region')
    .eq('country', 'SG');

  if (summary) {
    const counts = summary.reduce((acc, { region }) => {
      acc[region] = (acc[region] || 0) + 1;
      return acc;
    }, {});
    console.log('\nBy region:');
    Object.entries(counts).sort().forEach(([r, c]) => console.log(`  ${r}: ${c}`));
    console.log(`  TOTAL: ${summary.length}`);
  }
}

main().catch(console.error);
