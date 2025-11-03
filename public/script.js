console.log('Page loaded ✅');

const form = document.getElementById('form');
const input = document.getElementById('domain');
const result = document.getElementById('result');

function show(html) {
  result.innerHTML = html;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const domain = input.value.trim();
  if (!domain) return show('Please enter a domain');

  show('Checking... ⏳');

  try {
    const res = await fetch(`/api/oprank?domain=${encodeURIComponent(domain)}`);
    const data = await res.json();

    if (!res.ok || !data.ok) throw new Error(data.message || 'Request failed');

    show(`
      <h3>Result (Open PageRank)</h3>
      <p><b>Domain:</b> ${data.domain}</p>
      <p><b>Score:</b> ${data.page_rank_decimal ?? 'n/a'} (int: ${data.page_rank_integer ?? 'n/a'})</p>
      <p style="color:#9bb0d3"><small>Note: yeh DA/PA nahi, Open PageRank score hai (free).</small></p>
    `);
  } catch (err) {
    show(`<span style="color:#ff6b6b">Error: ${err.message}</span>`);
  }
});