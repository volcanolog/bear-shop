import React, { useEffect, useState } from "react";
import { api } from "../../api";
import "./UsersPanel.css";

// =============================================================================
//  Панель управления пользователями — доступна только админу.
// =============================================================================
//  Что умеет (по таблице из задания):
//    GET    /api/users         — список,
//    GET    /api/users/:id     — конкретный,
//    PUT    /api/users/:id     — редактирование (например, смена роли),
//    DELETE /api/users/:id     — блокировка (мягкое удаление).
//
//  Безопасность:
//    - Этот экран рендерим только если user.role === "admin" (см. App.js).
//    - Дополнительно сервер защищает все эти эндпоинты roleMiddleware([ADMIN]).
//    - Самого себя заблокировать нельзя (защита и на сервере, и на UI).
// =============================================================================

// Маппинги ролей → читаемые подписи и цвета бейджей.
const ROLE_LABELS = { admin: "Админ", seller: "Продавец", user: "Пользователь" };
const ROLE_COLORS = { admin: "#dc2626", seller: "#d97706", user: "#4f46e5" };

// Инлайн-стили оставлены, чтобы не плодить классы для одного экрана.
const TD_STYLE     = { padding: "10px 14px", borderBottom: "1px solid #1e1e3a", verticalAlign: "middle" };
const SMALL_BTN    = { padding: "5px 10px", fontSize: "12px", borderRadius: "6px", cursor: "pointer" };
const ROLE_BADGE   = { display: "inline-block", padding: "2px 8px", borderRadius: "999px", fontSize: "12px", fontWeight: 600, color: "#fff" };
const STATUS_BADGE = { display: "inline-block", padding: "2px 8px", borderRadius: "999px", fontSize: "12px", fontWeight: 500 };
const ACTIVE_STYLE  = { background: "#14532d", color: "#4ade80" };
const BLOCKED_STYLE = { background: "#450a0a", color: "#f87171" };

export default function UsersPanel({ currentUserId, onBack }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Если идёт редактирование роли — храним «черновик» здесь.
  // null  — никто не редактируется,
  // {...} — клон редактируемого пользователя (его меняем локально, потом
  //         отправляем на сервер при «Сохранить»).
  const [editingUser, setEditingUser] = useState(null);

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await api.getUsers();
      setUsers(data);
    } catch (err) {
      alert("Ошибка загрузки пользователей: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (id, updatedData) => {
    try {
      const updated = await api.updateUser(id, updatedData);
      // Объединяем старого пользователя с тем, что вернул сервер (на случай
      // если сервер прислал не все поля — мы их не теряем).
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...updated } : u)));
      setEditingUser(null);
    } catch (err) {
      alert("Ошибка обновления: " + (err.response?.data?.error || err.message));
    }
  };

  const handleBlockUser = async (id) => {
    if (!window.confirm("Заблокировать пользователя?")) return;
    try {
      await api.blockUser(id);
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, isBlocked: true } : u)));
    } catch (err) {
      alert("Ошибка блокировки: " + (err.response?.data?.error || err.message));
    }
  };

  if (loading) return <div className="empty">Загрузка пользователей...</div>;

  return (
    <div className="page">
      <header className="header">
        <div className="header__inner">
          <div className="brand">Медвежья лавка — Админ</div>
          <div className="header__right">
            {onBack && (
              <button className="btn" onClick={onBack}>← В магазин</button>
            )}
          </div>
        </div>
      </header>

      <main className="main">
        <div className="container">
          <div className="toolbar">
            <h1 className="title">Пользователи</h1>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
              <thead>
                <tr>
                  {["ID", "Имя", "Email", "Роль", "Статус", "Действия"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "10px 14px",
                        textAlign: "left",
                        borderBottom: "2px solid #2a2a4a",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isCurrent = String(u.id) === String(currentUserId);
                  const isEditing = editingUser?.id === u.id;
                  return (
                    <tr key={u.id} style={{ opacity: u.isBlocked ? 0.5 : 1 }}>
                      <td style={TD_STYLE}>#{u.id}</td>
                      <td style={TD_STYLE}>{u.firstName} {u.lastName}</td>
                      <td style={TD_STYLE}>{u.email}</td>

                      {/* Колонка с ролью: либо бейдж, либо select для редактирования */}
                      <td style={TD_STYLE}>
                        {isEditing ? (
                          <select
                            value={editingUser.role}
                            onChange={(e) =>
                              setEditingUser({ ...editingUser, role: e.target.value })
                            }
                            style={{ padding: "4px 8px", borderRadius: "6px", fontSize: "13px" }}
                          >
                            <option value="user">Пользователь</option>
                            <option value="seller">Продавец</option>
                            <option value="admin">Администратор</option>
                          </select>
                        ) : (
                          <span style={{ ...ROLE_BADGE, background: ROLE_COLORS[u.role] || "#6b7280" }}>
                            {ROLE_LABELS[u.role] || u.role}
                          </span>
                        )}
                      </td>

                      {/* Колонка статуса (активен / заблокирован) */}
                      <td style={TD_STYLE}>
                        <span style={{ ...STATUS_BADGE, ...(u.isBlocked ? BLOCKED_STYLE : ACTIVE_STYLE) }}>
                          {u.isBlocked ? "Заблокирован" : "Активен"}
                        </span>
                      </td>

                      {/* Колонка действий */}
                      <td style={{ ...TD_STYLE, display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        {isCurrent ? (
                          // Себе кнопок не показываем — это «вы».
                          <span style={{ opacity: 0.4, fontSize: "12px" }}>это вы</span>
                        ) : u.isBlocked ? (
                          // У заблокированных кнопок нет.
                          null
                        ) : isEditing ? (
                          <>
                            <button
                              className="btn btn--primary"
                              style={SMALL_BTN}
                              onClick={() => handleUpdateUser(u.id, { role: editingUser.role })}
                            >
                              Сохранить
                            </button>
                            <button
                              className="btn"
                              style={SMALL_BTN}
                              onClick={() => setEditingUser(null)}
                            >
                              Отмена
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="btn"
                              style={SMALL_BTN}
                              onClick={() => setEditingUser({ ...u })}
                            >
                              Роль
                            </button>
                            <button
                              className="btn"
                              style={{ ...SMALL_BTN, background: "#dc2626", color: "#fff", border: "none" }}
                              onClick={() => handleBlockUser(u.id)}
                            >
                              Блок
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
