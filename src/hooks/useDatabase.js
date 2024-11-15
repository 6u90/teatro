import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export function useDatabase() {
  const [theaters, setTheaters] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Carica i teatri
  const loadTheaters = async () => {
    try {
      const { data, error } = await supabase
        .from("theaters")
        .select(
          `
          *,
          unavailable_seats
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTheaters(data);
    } catch (error) {
      console.error("Error loading theaters:", error);
      setError(error.message);
    }
  };

  // Carica gli eventi
  const loadEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("events")
        .select(
          `
          *,
          theaters (
            name,
            rows,
            seats_per_row,
            unavailable_seats
          ),
          bookings (
            id,
            row_number,
            seat_number,
            first_name,
            last_name,
            ticket_id,
            checked_in
          )
        `
        )
        .order("date", { ascending: true });

      if (error) throw error;
      setEvents(data);
    } catch (error) {
      console.error("Error loading events:", error);
      setError(error.message);
    }
  };

  // Crea un nuovo teatro
  const createTheater = async (theaterData) => {
    try {
      const { data, error } = await supabase
        .from("theaters")
        .insert([theaterData])
        .select();

      if (error) throw error;

      setTheaters((current) => [...current, data[0]]);
      return data[0];
    } catch (error) {
      console.error("Error creating theater:", error);
      throw error;
    }
  };

  // Crea un nuovo evento
  const createEvent = async (eventData) => {
    try {
      const { data, error } = await supabase
        .from("events")
        .insert([eventData])
        .select();

      if (error) throw error;

      setEvents((current) => [...current, data[0]]);
      return data[0];
    } catch (error) {
      console.error("Error creating event:", error);
      throw error;
    }
  };

  // Crea una prenotazione
  const createBooking = async (bookingData) => {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .insert([bookingData])
        .select();

      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error("Error creating booking:", error);
      throw error;
    }
  };

  // Aggiorna lo stato del check-in
  const updateCheckIn = async (bookingId, checkedIn) => {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .update({ checked_in: checkedIn })
        .eq("id", bookingId)
        .select();

      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error("Error updating check-in:", error);
      throw error;
    }
  };

  // Carica i dati iniziali
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        await Promise.all([loadTheaters(), loadEvents()]);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();

    // Sottoscrizione ai cambiamenti in tempo reale
    const theatersSubscription = supabase
      .channel("theaters-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "theaters" },
        loadTheaters
      )
      .subscribe();

    const eventsSubscription = supabase
      .channel("events-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "events" },
        loadEvents
      )
      .subscribe();

    return () => {
      theatersSubscription.unsubscribe();
      eventsSubscription.unsubscribe();
    };
  }, []);

  // Aggiorna i posti inesistenti per un teatro
  const updateTheaterUnavailableSeats = async (theaterId, unavailableSeats) => {
    try {
      const { data, error } = await supabase
        .from("theaters")
        .update({
          unavailable_seats: unavailableSeats,
          updated_at: new Date(),
        })
        .eq("id", theaterId).select(`
          id,
          name,
          rows,
          seats_per_row,
          unavailable_seats
        `);

      if (error) throw error;

      // Aggiorna lo stato locale
      setTheaters((current) =>
        current.map((theater) => (theater.id === theaterId ? data[0] : theater))
      );

      return data[0];
    } catch (error) {
      console.error("Error updating theater unavailable seats:", error);
      throw error;
    }
  };

  const updateEvent = async (eventId, eventData) => {
    try {
      const { data, error } = await supabase
        .from("events")
        .update(eventData)
        .eq("id", eventId)
        .select();

      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error("Error updating event:", error);
      throw error;
    }
  };

  const deleteEvent = async (eventId) => {
    try {
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", eventId);

      if (error) throw error;
    } catch (error) {
      console.error("Error deleting event:", error);
      throw error;
    }
  };

  return {
    theaters,
    events,
    loading,
    error,
    createTheater,
    createEvent,
    createBooking,
    updateCheckIn,
    loadTheaters,
    loadEvents,
    updateTheaterUnavailableSeats,
    updateEvent,
    deleteEvent,
    loadEvents,
    loadTheaters,
  };
}
