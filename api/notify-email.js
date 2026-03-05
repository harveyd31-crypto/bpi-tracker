export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { type, ticket, ts, geo, photoUrl, testRecipient } = req.body;
  if (!type || !ticket) return res.status(400).json({ error: "Missing data" });

  const apiKey = process.env.RESEND_API_KEY;
  const recipients = testRecipient ? [testRecipient] : [
    "vikram@gmcpl.net",
    "dh@gmcpl.net",
    "arun@gmcpl.net",
    "Abdessamad@gmcpl.net",
    "ravi@gmcpl.net"
  ];

  const isTruck = type === "truck";
  const subject = isTruck
    ? `🚛 Truck Loaded — ${ticket.ticketNo || "—"} · ${ticket.immatriculation || "—"} · ${ticket.fournisseur || "—"}`
    : `🧪 Sample Collected — ${ticket.supplier || "—"} · ${ticket.mineReference || "—"} · ${ticket.tonnage || "—"}`;

  const photoSection = photoUrl ? `
    <div style="margin-top:24px;">
      <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Slip Photo</div>
      <img src="${photoUrl}" style="width:100%;max-width:480px;border-radius:8px;display:block;" />
    </div>` : "";

  const geoSection = geo ? `
    <div style="margin-top:16px;">
      <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">GPS Location</div>
      <a href="https://maps.google.com/?q=${geo.lat},${geo.lng}" style="color:#0A84FF;font-size:13px;">
        ${Math.abs(geo.lat).toFixed(4)}°${geo.lat>=0?"N":"S"} ${Math.abs(geo.lng).toFixed(4)}°${geo.lng>=0?"E":"W"} — Open in Maps
      </a>
    </div>` : "";

  const rows = isTruck ? [
    ["Ticket No", ticket.ticketNo],
    ["Date", ticket.date],
    ["Truck", ticket.immatriculation],
    ["Fournisseur", ticket.fournisseur],
    ["Mine Ref", ticket.mineReference],
    ["Lieu de chargement", ticket.lieuChargement],
    ["Lieu de livraison", ticket.lieuLivraison],
    ["Marchandise", ticket.marchandise],
    ["Heure départ", ticket.heureDepart],
    ["Poids brut", ticket.poidsBrut],
    ["Poids tare", ticket.poidsTare],
    ["Poids net", ticket.poidsNet],
  ] : [
    ["Date", ticket.date],
    ["Supplier", ticket.supplier],
    ["Mine Reference", ticket.mineReference],
    ["Tonnage", ticket.tonnage],
    ["Collection Point", ticket.collectionPoint],
    ["Notes", ticket.notes],
  ];

  const tableRows = rows
    .filter(([,v]) => v && v !== "—" && v !== "TBD")
    .map(([k,v]) => `
      <tr>
        <td style="padding:8px 12px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.06em;white-space:nowrap;border-bottom:1px solid #f0f0f0;">${k}</td>
        <td style="padding:8px 12px;font-size:14px;color:#111;font-weight:500;border-bottom:1px solid #f0f0f0;">${v}</td>
      </tr>`).join("");

  const color = isTruck ? "#30D158" : "#FF9F0A";
  const icon = isTruck ? "🚛" : "🧪";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
    
    <!-- Header -->
    <div style="background:#000;padding:24px 28px;display:flex;align-items:center;">
      <div style="font-size:28px;margin-right:14px;">${icon}</div>
      <div>
        <div style="font-size:11px;color:${color};font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">BPI Agadir · Field Operations</div>
        <div style="font-size:20px;color:#fff;font-weight:700;margin-top:2px;">${isTruck ? "Truck Loaded" : "Sample Collected"}</div>
        <div style="font-size:12px;color:rgba(255,255,255,0.45);margin-top:3px;">${ts || new Date().toLocaleString("en-GB",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"})}</div>
      </div>
    </div>

    <!-- Data table -->
    <div style="padding:20px 28px 8px;">
      <table style="width:100%;border-collapse:collapse;">
        ${tableRows}
      </table>
    </div>

    <!-- Photo & GPS -->
    <div style="padding:8px 28px 28px;">
      ${geoSection}
      ${photoSection}
    </div>

    <!-- Footer -->
    <div style="background:#f5f5f7;padding:14px 28px;text-align:center;font-size:11px;color:#aaa;">
      BPI Agadir Field Tracker · Barite Processing International
    </div>
  </div>
</body>
</html>`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "BPI Field Tracker <onboarding@resend.dev>",
        to: recipients,
        subject,
        html,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("Resend error:", data);
      return res.status(500).json({ error: data.message || "Email error" });
    }
    return res.status(200).json({ success: true, id: data.id });
  } catch (err) {
    console.error("Email error:", err);
    return res.status(500).json({ error: err.message });
  }
}
