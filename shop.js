import { db } from "./firebase.js";
import { ref, get, onValue } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-database.js";

const state = { products: [], category: "الكل", search: "", cart: [] };
const els = {
  grid: document.getElementById("productsGrid"), empty: document.getElementById("emptyState"), categories: document.getElementById("categories"),
  search: document.getElementById("searchInput"), clear: document.getElementById("clearSearch"), result: document.getElementById("resultCount"),
  drawer: document.getElementById("cartDrawer"), overlay: document.getElementById("cartOverlay"), items: document.getElementById("cartItems"), emptyCart: document.getElementById("cartEmpty"),
  count: document.getElementById("cartCount"), itemsLabel: document.getElementById("cartItemsLabel"), total: document.getElementById("cartTotal"), toast: document.getElementById("toast")
};

const money = n => `${Number(n || 0).toLocaleString("ar-MA", {minimumFractionDigits:2, maximumFractionDigits:2})} درهم`;
const escapeHTML = value => String(value ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[c]));

function normalizeProduct(p, key) {
  return { id: p.id ?? key, name: p.name || "منتج", category: p.category || "أخرى", price: Number(p.price) || 0, stock: Math.max(0, Number(p.stock) || 0), lowStockThreshold: Number(p.lowStockThreshold) || 10, image: p.image || "" , hidden: p.hidden === true };
}

async function loadProducts() {
  try {
    const snapshot = await get(ref(db, "products"));
    const data = snapshot.val();
    state.products = data ? Object.entries(data).map(([key, value]) => normalizeProduct(value, key)) : [];
    render();
  } catch (error) {
    console.error("Shop products load failed:", error);
    els.result.textContent = "تعذر تحميل المنتجات";
    showToast("تعذر تحميل المنتجات من قاعدة البيانات");
  }
}

function subscribeToProducts() {
  onValue(ref(db, "products"), snapshot => {
    const data = snapshot.val();
    state.products = data ? Object.entries(data).map(([key, value]) => normalizeProduct(value, key)) : [];
    render();
  }, error => console.error("Realtime shop sync failed:", error));
}

function categories() {
  const values = [...new Set(state.products.filter(p => !p.hidden).map(p => p.category).filter(Boolean))];
  const ordered = ["الكل", ...values.filter(v => v !== "الكل")];
  els.categories.innerHTML = ordered.map(c => `<button class="cat ${state.category === c ? "active" : ""}" data-category="${escapeHTML(c)}">${escapeHTML(c)}</button>`).join("");
  els.categories.querySelectorAll(".cat").forEach(btn => btn.addEventListener("click", () => { state.category = btn.dataset.category; render(); }));
}

function filteredProducts() {
  const q = state.search.trim().toLowerCase();
  return state.products.filter(p => !p.hidden)
    .filter(p => state.category === "الكل" || p.category === state.category)
    .filter(p => !q || `${p.name} ${p.category}`.toLowerCase().includes(q))
    .sort((a,b) => a.name.localeCompare(b.name, "ar", { sensitivity:"base" }));
}

function productCard(p) {
  const out = p.stock <= 0, low = !out && p.stock <= p.lowStockThreshold;
  const status = out ? "غير متوفر" : low ? "كمية محدودة" : "متوفر";
  const cls = out ? "out" : low ? "low" : "";
  const fallback = "https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=800&auto=format&fit=crop&q=80";
  return `<article class="product-card">
    <div class="product-image"><img loading="lazy" src="${escapeHTML(p.image || fallback)}" alt="${escapeHTML(p.name)}" onerror="this.src='${fallback}'"><span class="status ${cls}">${status}</span></div>
    <div class="product-body"><div class="product-category">${escapeHTML(p.category)}</div><h3 class="product-name">${escapeHTML(p.name)}</h3>
      <div class="price-row"><div><div class="price">${money(p.price).replace(" درهم","")} <small>درهم</small></div><div class="stock">المخزون: ${p.stock}</div></div>
      <button class="add-btn" ${out ? "disabled" : ""} data-add="${escapeHTML(String(p.id))}" aria-label="إضافة ${escapeHTML(p.name)}"><i class="fa-solid fa-cart-plus"></i></button></div>
    </div></article>`;
}

function render() {
  categories();
  const list = filteredProducts();
  els.result.textContent = `${list.length} منتج${list.length === 1 ? "" : "اً"}`;
  els.grid.innerHTML = list.map(productCard).join("");
  els.empty.classList.toggle("hidden", list.length !== 0);
  els.grid.querySelectorAll("[data-add]").forEach(btn => btn.addEventListener("click", () => addToCart(btn.dataset.add)));
}

function addToCart(id) {
  const p = state.products.find(x => String(x.id) === String(id)); if (!p || p.stock <= 0) return;
  const item = state.cart.find(x => String(x.id) === String(id));
  if (item) { if (item.qty < p.stock) item.qty++; else return showToast("لا توجد كمية إضافية من هذا المنتج"); }
  else state.cart.push({id:p.id, qty:1});
  renderCart(); showToast("تمت إضافة المنتج إلى السلة");
}

function changeQty(id, delta) {
  const item = state.cart.find(x => String(x.id) === String(id)); const p = state.products.find(x => String(x.id) === String(id)); if (!item || !p) return;
  item.qty += delta; if (item.qty <= 0) state.cart = state.cart.filter(x => String(x.id) !== String(id)); else if (item.qty > p.stock) item.qty = p.stock;
  renderCart();
}

function renderCart() {
  const detailed = state.cart.map(i => ({...i, product:state.products.find(p => String(p.id) === String(i.id))})).filter(i => i.product);
  const count = detailed.reduce((s,i) => s+i.qty, 0); const total = detailed.reduce((s,i) => s + i.product.price*i.qty, 0);
  els.count.textContent = count; els.itemsLabel.textContent = `${count} منتجات`; els.total.textContent = money(total);
  els.items.innerHTML = detailed.map(i => `<div class="cart-item"><img src="${escapeHTML(i.product.image || "https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=200&auto=format&fit=crop&q=80")}" alt=""><div><h4>${escapeHTML(i.product.name)}</h4><p>${money(i.product.price)}</p><div class="qty"><button data-qty="${escapeHTML(String(i.id))}" data-delta="-1">−</button><span>${i.qty}</span><button data-qty="${escapeHTML(String(i.id))}" data-delta="1">+</button></div></div><button class="remove" data-remove="${escapeHTML(String(i.id))}" aria-label="حذف"><i class="fa-solid fa-trash"></i></button></div>`).join("");
  els.emptyCart.classList.toggle("hidden", detailed.length !== 0);
  els.items.classList.toggle("hidden", detailed.length === 0);
  els.items.querySelectorAll("[data-qty]").forEach(b => b.addEventListener("click", () => changeQty(b.dataset.qty, Number(b.dataset.delta))));
  els.items.querySelectorAll("[data-remove]").forEach(b => b.addEventListener("click", () => { state.cart = state.cart.filter(x => String(x.id) !== String(b.dataset.remove)); renderCart(); }));
}

function openCart() { els.drawer.classList.add("open"); els.drawer.setAttribute("aria-hidden","false"); document.body.style.overflow="hidden"; }
function closeCart() { els.drawer.classList.remove("open"); els.drawer.setAttribute("aria-hidden","true"); document.body.style.overflow=""; }
function showToast(message) { els.toast.textContent = message; els.toast.classList.add("show"); clearTimeout(showToast.timer); showToast.timer=setTimeout(()=>els.toast.classList.remove("show"),2200); }

function copyOrder() {
  if (!state.cart.length) return showToast("السلة فارغة");
  const lines = ["طلب من Mostafa Clean Shop", ""];
  let total = 0;
  state.cart.forEach(i => { const p=state.products.find(x=>String(x.id)===String(i.id)); if(!p)return; total += p.price*i.qty; lines.push(`- ${p.name} × ${i.qty} = ${money(p.price*i.qty)}`); });
  lines.push("", `المجموع: ${money(total)}`);
  navigator.clipboard?.writeText(lines.join("\n")).then(()=>showToast("تم نسخ الطلب")).catch(()=>showToast("تعذر النسخ، حاول مرة أخرى"));
}

els.search.addEventListener("input", e => { state.search=e.target.value; render(); });
els.clear.addEventListener("click", () => { state.search=""; els.search.value=""; render(); els.search.focus(); });
document.getElementById("cartOpenBtn").addEventListener("click", openCart);
document.getElementById("cartCloseBtn").addEventListener("click", closeCart);
els.overlay.addEventListener("click", closeCart);
document.getElementById("copyOrderBtn").addEventListener("click", copyOrder);

renderCart();
loadProducts().then(subscribeToProducts);
