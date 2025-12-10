function renderWithdrawMenu() {
  const container = document.getElementById('fiatContentArea');
  const title = document.getElementById('modalTitle');
  const header = document.getElementById('fiatTabHeader');
  
  if(title) title.textContent = 'Withdraw Funds';
  if(header) header.style.display = 'flex';
  
  updateFiatTabs('withdraw');

  if (!container) return;

  container.innerHTML = `
    <div class="fiat-menu-item" onclick="showWithdrawDetail('USDT-TRC20')">
      <div style="display:flex; align-items:center;">
        <div class="fiat-icon-circle" style="background:#26a17b;">T</div>
        <span style="font-weight:600;">USDT-TRC20 Withdrawal</span>
      </div>
      <span style="color:#636e72;">›</span>
    </div>

    <div class="fiat-menu-item" onclick="showWithdrawDetail('USDT-ERC20')">
      <div style="display:flex; align-items:center;">
        <div class="fiat-icon-circle" style="background:#26a17b;">T</div>
        <span style="font-weight:600;">USDT-ERC20 Withdrawal</span>
      </div>
      <span style="color:#636e72;">›</span>
    </div>

    <div class="fiat-menu-item" onclick="showWithdrawDetail('BTC-Bitcoin')">
      <div style="display:flex; align-items:center;">
        <div class="fiat-icon-circle" style="background:#f7931a;">₿</div>
        <span style="font-weight:600;">BTC-Bitcoin Withdrawal</span>
      </div>
      <span style="color:#636e72;">›</span>
    </div>

    <div class="fiat-menu-item" onclick="showWithdrawDetail('ETH-ERC20')">
      <div style="display:flex; align-items:center;">
        <div class="fiat-icon-circle" style="background:#627eea;">Ξ</div>
        <span style="font-weight:600;">ETH-ERC20 Withdrawal</span>
      </div>
      <span style="color:#636e72;">›</span>
    </div>
    
    <div class="fiat-menu-item" onclick="showWithdrawDetail('USDC-BEP20')">
      <div style="display:flex; align-items:center;">
        <div class="fiat-icon-circle" style="background:#2980b9;">$</div>
        <span style="font-weight:600;">USDC-BEP20 Withdrawal</span>
      </div>
      <span style="color:#636e72;">›</span>
    </div>

    <div class="fiat-menu-item" onclick="showWithdrawDetail('Other')">
      <div style="display:flex; align-items:center;">
        <div class="fiat-icon-circle" style="background:#6c5ce7;">+</div>
        <span style="font-weight:600;">Other</span>
      </div>
      <span style="color:#636e72;">›</span>
    </div>
  `;
}
