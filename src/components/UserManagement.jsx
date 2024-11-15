import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { supabase } from "../lib/supabaseClient";

export const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.from("user_profiles").select(`
          *,
          users:id (
            email
          )
        `);

      if (error) throw error;
      setUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId, newRole) => {
    try {
      const { error } = await supabase
        .from("user_profiles")
        .update({ role: newRole })
        .eq("id", userId);

      if (error) throw error;

      fetchUsers();
    } catch (error) {
      alert("Errore durante l'aggiornamento del ruolo: " + error.message);
    }
  };

  if (loading) {
    return <div>Caricamento utenti...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestione Utenti</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left">Email</th>
                <th className="px-4 py-2 text-left">Ruolo</th>
                <th className="px-4 py-2 text-left">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b">
                  <td className="px-4 py-2">{user.users?.email}</td>
                  <td className="px-4 py-2">{user.role}</td>
                  <td className="px-4 py-2">
                    <select
                      value={user.role}
                      onChange={(e) => updateUserRole(user.id, e.target.value)}
                      className="w-full p-2 border rounded"
                    >
                      <option value="admin">Admin</option>
                      <option value="venditore">Venditore</option>
                      <option value="addetto_checkin">Addetto Check-in</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
