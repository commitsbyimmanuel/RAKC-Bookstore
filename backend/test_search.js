const API_URL = 'http://localhost:3001/books';

async function testSearch() {
  try {
    console.log('Testing search for "people"...');
    const res1 = await fetch(`${API_URL}?search=people`);
    const data1 = await res1.json();
    console.log('Results:', data1.map(b => b.title));

    console.log('\nTesting search for ISBN (partial)...');
    const res2 = await fetch(`${API_URL}?search=978`);
    const data2 = await res2.json();
    console.log('Results count:', data2.length);
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testSearch();
