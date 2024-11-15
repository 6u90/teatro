import React, { useState } from "react";
import { QrReader } from "react-qr-reader";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./components/ui/dialog";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import {
  Plus,
  Theater,
  Armchair,
  QrCode,
  Users,
  CheckCircle2,
  X,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { useDatabase } from "./hooks/useDatabase";
import { supabase } from "./lib/supabaseClient";
import { Auth } from "./components/Auth";
import { useAuth } from "./hooks/useAuth";

// Stili per i pulsanti
const buttonVariants = {
  primary: "bg-black text-white hover:bg-gray-800",
  outline: "border-2 border-gray-200 hover:bg-gray-100",
  destructive: "bg-red-500 text-white hover:bg-red-600",
  ghost: "hover:bg-gray-100",
};

function App() {
  // Hook Supabase
  const {
    theaters,
    events,
    loading,
    error,
    createTheater,
    createEvent,
    createBooking,
    updateCheckIn,
    updateTheaterUnavailableSeats,
    updateEvent,
    deleteEvent,
    loadEvents,
    loadTheaters,
  } = useDatabase();

  // Stati per i dialogs
  const [showNewTheaterDialog, setShowNewTheaterDialog] = useState(false);
  const [showNewEventDialog, setShowNewEventDialog] = useState(false);
  const [showSeatDialog, setShowSeatDialog] = useState(false);
  const [showTheaterManagementDialog, setShowTheaterManagementDialog] =
    useState(false);
  const [showEditEventDialog, setShowEditEventDialog] = useState(false);

  // Stati per selezioni e dati temporanei
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedTheater, setSelectedTheater] = useState(null);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);

  // Stati per il check-in
  const [qrCode, setQrCode] = useState("");
  const [checkinInfo, setCheckinInfo] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState(null);

  // Stati per i form
  const [newTheater, setNewTheater] = useState({
    name: "",
    rows: 0,
    seats_per_row: 0,
    unavailable_seats: [],
  });

  const [newEvent, setNewEvent] = useState({
    name: "",
    date: "",
    theater_id: "",
  });

  const [booking, setBooking] = useState({
    first_name: "",
    last_name: "",
    ticket_id: "",
  });

  // Handler per la gestione dei teatri
  const handleCreateTheater = async () => {
    try {
      if (
        !newTheater.name ||
        newTheater.rows <= 0 ||
        newTheater.seats_per_row <= 0
      ) {
        alert("Inserisci tutti i dati del teatro");
        return;
      }

      await createTheater({
        name: newTheater.name,
        rows: parseInt(newTheater.rows),
        seats_per_row: parseInt(newTheater.seats_per_row),
      });
      await loadTheaters();
      setShowNewTheaterDialog(false);
      setNewTheater({
        name: "",
        rows: 0,
        seats_per_row: 0,
        unavailable_seats: [],
      });
    } catch (error) {
      alert("Errore durante la creazione del teatro: " + error.message);
    }
  };

  const handleTheaterManagement = (theater) => {
    setSelectedTheater(theater);
    setNewTheater({
      ...theater,
      unavailable_seats: theater.unavailable_seats || [],
    });
    setShowTheaterManagementDialog(true);
  };

  const handleSaveUnavailableSeats = async () => {
    try {
      await updateTheaterUnavailableSeats(
        selectedTheater.id,
        newTheater.unavailable_seats
      );
      await loadTheaters();
      await loadEvents();
      setShowTheaterManagementDialog(false);
    } catch (error) {
      console.error("Error saving unavailable seats:", error);
    }
  };

  // Handler per la gestione degli eventi
  const handleCreateEvent = async () => {
    try {
      if (!newEvent.name || !newEvent.date || !newEvent.theater_id) {
        alert("Inserisci tutti i dati dell'evento");
        return;
      }

      const eventId = Math.floor(Math.random() * 900 + 100).toString();
      await createEvent({
        id: eventId,
        name: newEvent.name,
        date: newEvent.date,
        theater_id: newEvent.theater_id,
      });

      setShowNewEventDialog(false);
      setNewEvent({ name: "", date: "", theater_id: "" });
    } catch (error) {
      alert("Errore durante la creazione dell'evento: " + error.message);
    }
  };

  const handleEditEvent = (event) => {
    setEditingEvent(event);
    setShowEditEventDialog(true);
  };

  const handleSaveEventEdit = async () => {
    try {
      if (
        !editingEvent?.name ||
        !editingEvent?.date ||
        !editingEvent?.theater_id
      ) {
        alert("Inserisci tutti i dati dell'evento");
        return;
      }

      await updateEvent(editingEvent.id, {
        name: editingEvent.name,
        date: editingEvent.date,
        theater_id: editingEvent.theater_id,
      });

      setShowEditEventDialog(false);
      setEditingEvent(null);
      await loadEvents();
    } catch (error) {
      alert("Errore durante il salvataggio delle modifiche: " + error.message);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm("Sei sicuro di voler eliminare questo evento?")) {
      return;
    }

    try {
      await deleteEvent(eventId);
      await loadEvents();
    } catch (error) {
      alert("Errore durante l'eliminazione dell'evento: " + error.message);
    }
  };

  // Handler per la gestione delle prenotazioni
  const handleBookSeat = async () => {
    try {
      if (!booking.first_name || !booking.last_name || !booking.ticket_id) {
        alert("Inserisci tutti i dati richiesti");
        return;
      }

      await createBooking({
        event_id: selectedEvent.id,
        row_number: selectedSeat.row + 1,
        seat_number: selectedSeat.seat + 1,
        first_name: booking.first_name,
        last_name: booking.last_name,
        ticket_id: booking.ticket_id,
        checked_in: false,
      });

      // Ricarica i dati
      await loadEvents();

      // Aggiorna l'evento selezionato con i nuovi dati
      const updatedEvent = await supabase
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
        .eq("id", selectedEvent.id)
        .single();

      if (updatedEvent.data) {
        setSelectedEvent(updatedEvent.data);
      }

      setShowSeatDialog(false);
      setBooking({ first_name: "", last_name: "", ticket_id: "" });
    } catch (error) {
      alert("Errore durante la prenotazione: " + error.message);
    }
  };

  // Handler per la gestione del check-in
  const handleQrScan = async (qrCode) => {
    try {
      setScanError(null);
      const { data: booking, error } = await supabase
        .from("bookings")
        .select(
          `
          *,
          events (
            name,
            date,
            theaters (
              name
            )
          )
        `
        )
        .eq("ticket_id", qrCode)
        .single();

      if (error) throw error;

      if (!booking) {
        setScanError("Biglietto non trovato!");
        return;
      }

      if (booking.checked_in) {
        setScanError(
          "Attenzione: questo biglietto è già stato utilizzato per l'accesso!"
        );
        return;
      }

      setCheckinInfo({
        ...booking,
        eventName: booking.events.name,
        eventDate: booking.events.date,
        theaterName: booking.events.theaters.name,
      });
      setIsScanning(false);
    } catch (error) {
      setScanError("Errore durante la verifica: " + error.message);
    }
  };

  const handleConfirmCheckin = async () => {
    try {
      await updateCheckIn(checkinInfo.id, true);
      await loadEvents();
      alert("Check-in completato con successo!");
      setCheckinInfo(null);
      setQrCode("");
      setScanError(null);
    } catch (error) {
      alert("Errore durante il check-in: " + error.message);
    }
  };

  const handleRejectCheckin = () => {
    const reason = window.prompt(
      "Inserisci il motivo del rifiuto (opzionale):"
    );
    if (reason) {
      console.log(`Check-in rifiutato. Motivo: ${reason}`);
    }
    setCheckinInfo(null);
    setQrCode("");
    setScanError(null);
  };
  // Loading e Error states
  if (loading) {
    return <div className="p-4">Caricamento...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Errore: {error}</div>;
  }

  return (
    <div className="p-4">
      <Tabs defaultValue="bookings" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="bookings">Prenotazioni</TabsTrigger>
          <TabsTrigger value="events">Eventi</TabsTrigger>
          <TabsTrigger value="theaters">Gestisci Teatri</TabsTrigger>
          <TabsTrigger value="checkin">Check-in</TabsTrigger>
        </TabsList>

        {/* Tab Eventi */}
        <TabsContent value="events">
          <div className="mb-6">
            <Button
              onClick={() => setShowNewEventDialog(true)}
              className={buttonVariants.primary}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nuovo Evento
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.length === 0 ? (
              <div className="col-span-3 text-center p-4">
                <p className="text-gray-500">Nessun evento disponibile</p>
              </div>
            ) : (
              events.map((event) => (
                <Card
                  key={event.id}
                  className="hover:shadow-lg transition-shadow"
                >
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Theater className="mr-2 h-4 w-4" />
                        {event.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        ID: {event.id}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p>Data: {new Date(event.date).toLocaleDateString()}</p>
                      <p>Teatro: {event.theaters?.name}</p>
                      <p>
                        Capienza:{" "}
                        {event.theaters?.rows * event.theaters?.seats_per_row}{" "}
                        posti
                      </p>
                      <p>
                        Prenotazioni: {event.bookings?.length || 0} posti
                        occupati
                      </p>
                      <div className="flex gap-2 mt-4">
                        <Button
                          className={`flex-1 ${buttonVariants.outline}`}
                          onClick={() => handleEditEvent(event)}
                        >
                          Modifica
                        </Button>
                        <Button
                          className={`flex-1 ${buttonVariants.destructive}`}
                          onClick={() => handleDeleteEvent(event.id)}
                        >
                          Elimina
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Tab Prenotazioni */}
        <TabsContent value="bookings">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.length === 0 ? (
              <div className="col-span-3 text-center p-4">
                <p className="text-gray-500">Nessun evento disponibile</p>
              </div>
            ) : (
              events.map((event) => (
                <Card
                  key={event.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                >
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Theater className="mr-2 h-4 w-4" />
                      {event.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>Data: {new Date(event.date).toLocaleDateString()}</p>
                    <p>
                      Teatro: {event.theaters?.name} (File:{" "}
                      {event.theaters?.rows}, Posti per fila:{" "}
                      {event.theaters?.seats_per_row})
                    </p>
                    <p>
                      Prenotazioni: {event.bookings?.length || 0} /{" "}
                      {event.theaters?.rows * event.theaters?.seats_per_row}
                    </p>
                    <Button
                      className={`mt-2 w-full ${buttonVariants.primary}`}
                      onClick={() => setSelectedEvent(event)}
                    >
                      <Users className="mr-2 h-4 w-4" />
                      Gestisci Posti
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Mappa dei posti e Lista Prenotazioni */}
          {selectedEvent && (
            <div>
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{selectedEvent.name} - Mappa Posti</span>
                    <Button
                      variant="outline"
                      onClick={() => setSelectedEvent(null)}
                      className={buttonVariants.outline}
                    >
                      Chiudi
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-64 h-12 bg-gray-200 flex items-center justify-center mb-8 rounded">
                      PALCOSCENICO
                    </div>

                    {selectedEvent?.theaters?.rows &&
                      Array.from({ length: selectedEvent.theaters.rows }).map(
                        (_, rowIndex) => (
                          <div key={rowIndex} className="flex gap-2">
                            <span className="w-8 text-right">
                              F{rowIndex + 1}
                            </span>
                            {Array.from({
                              length: selectedEvent.theaters.seats_per_row,
                            }).map((_, seatIndex) => {
                              const booking = selectedEvent.bookings?.find(
                                (b) =>
                                  b.row_number === rowIndex + 1 &&
                                  b.seat_number === seatIndex + 1
                              );
                              return (
                                <button
                                  key={`${rowIndex}-${seatIndex}`}
                                  className={`w-8 h-8 rounded flex items-center justify-center ${
                                    selectedEvent.theaters.unavailable_seats?.includes(
                                      `${rowIndex + 1}-${seatIndex + 1}`
                                    )
                                      ? "bg-gray-500"
                                      : booking?.checked_in
                                      ? "bg-blue-500"
                                      : booking
                                      ? "bg-red-500"
                                      : "bg-green-500 hover:bg-green-600"
                                  }`}
                                  disabled={
                                    booking !== undefined ||
                                    selectedEvent.theaters.unavailable_seats?.includes(
                                      `${rowIndex + 1}-${seatIndex + 1}`
                                    )
                                  }
                                  onClick={() => {
                                    setSelectedSeat({
                                      row: rowIndex,
                                      seat: seatIndex,
                                    });
                                    setShowSeatDialog(true);
                                  }}
                                >
                                  <Armchair className="w-6 h-6 text-white" />
                                </button>
                              );
                            })}
                          </div>
                        )
                      )}

                    <div className="mt-4 flex gap-4">
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
                        <span>Disponibile</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
                        <span>Occupato</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-blue-500 rounded mr-2"></div>
                        <span>Check-in effettuato</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-gray-500 rounded mr-2"></div>
                        <span>Posto Inesistente</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Lista Prenotazioni</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-2 text-left">Nome</th>
                          <th className="px-4 py-2 text-left">Cognome</th>
                          <th className="px-4 py-2 text-left">Posto</th>
                          <th className="px-4 py-2 text-left">
                            Codice Biglietto
                          </th>
                          <th className="px-4 py-2 text-left">Stato</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedEvent.bookings?.length > 0 ? (
                          selectedEvent.bookings.map((booking, index) => (
                            <tr key={index} className="border-b">
                              <td className="px-4 py-2">
                                {booking.first_name}
                              </td>
                              <td className="px-4 py-2">{booking.last_name}</td>
                              <td className="px-4 py-2">
                                Fila {booking.row_number}, Posto{" "}
                                {booking.seat_number}
                              </td>
                              <td className="px-4 py-2">{booking.ticket_id}</td>
                              <td className="px-4 py-2">
                                {booking.checked_in ? (
                                  <span className="text-green-500 flex items-center">
                                    <CheckCircle2 className="mr-1 h-4 w-4" />
                                    Check-in effettuato
                                  </span>
                                ) : (
                                  <span className="text-gray-500">
                                    In attesa
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan={5}
                              className="px-4 py-2 text-center text-gray-500"
                            >
                              Nessuna prenotazione effettuata
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Tab Gestione Teatri */}
        <TabsContent value="theaters">
          <div className="mb-6">
            <Button
              onClick={() => setShowNewTheaterDialog(true)}
              className={buttonVariants.primary}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nuovo Teatro
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {theaters.length === 0 ? (
              <div className="col-span-3 text-center p-4">
                <p className="text-gray-500">Nessun teatro disponibile</p>
              </div>
            ) : (
              theaters.map((theater) => (
                <Card key={theater.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Theater className="mr-2 h-4 w-4" />
                      {theater.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>File: {theater.rows}</p>
                    <p>Posti per fila: {theater.seats_per_row}</p>
                    <Button
                      className={`mt-2 w-full ${buttonVariants.primary}`}
                      onClick={() => handleTheaterManagement(theater)}
                    >
                      <Users className="mr-2 h-4 w-4" />
                      Gestisci Posti
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Tab Check-in */}
        <TabsContent value="checkin">
          <Card>
            <CardHeader>
              <CardTitle>Check-in Biglietti</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {!isScanning && !checkinInfo && (
                  <Button
                    onClick={() => setIsScanning(true)}
                    className={buttonVariants.primary}
                  >
                    <QrCode className="mr-2 h-4 w-4" />
                    Scansiona Biglietto
                  </Button>
                )}

                {isScanning && (
                  <div className="space-y-4">
                    <div className="relative max-w-md mx-auto">
                      <QrReader
                        constraints={{ facingMode: "environment" }}
                        onResult={(result, error) => {
                          if (result) {
                            handleQrScan(result?.text);
                          }
                          if (error) {
                            console.error(error);
                          }
                        }}
                        className="w-full"
                        videoStyle={{ borderRadius: "0.5rem" }}
                      />
                      <Button
                        onClick={() => setIsScanning(false)}
                        className={`${buttonVariants.outline} absolute top-2 right-2`}
                      >
                        Chiudi Camera
                      </Button>
                    </div>
                    <p className="text-sm text-center text-gray-500">
                      Inquadra il codice QR del biglietto con la fotocamera
                    </p>
                  </div>
                )}

                {scanError && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <p className="text-red-600">{scanError}</p>
                    <Button
                      onClick={() => setScanError(null)}
                      className={`${buttonVariants.outline} mt-2`}
                    >
                      Riprova
                    </Button>
                  </div>
                )}

                {checkinInfo && (
                  <Card>
                    <CardContent className="mt-4">
                      <h3 className="text-lg font-bold mb-4">
                        Informazioni Biglietto:
                      </h3>
                      <div className="space-y-2 mb-6">
                        <p>
                          <span className="font-medium">Nome:</span>{" "}
                          {checkinInfo.first_name}
                        </p>
                        <p>
                          <span className="font-medium">Cognome:</span>{" "}
                          {checkinInfo.last_name}
                        </p>
                        <p>
                          <span className="font-medium">Evento:</span>{" "}
                          {checkinInfo.eventName}
                        </p>
                        <p>
                          <span className="font-medium">Teatro:</span>{" "}
                          {checkinInfo.theaterName}
                        </p>
                        <p>
                          <span className="font-medium">Data:</span>{" "}
                          {new Date(checkinInfo.eventDate).toLocaleDateString()}
                        </p>
                        <p>
                          <span className="font-medium">Posto:</span> Fila{" "}
                          {checkinInfo.row_number}, Posto{" "}
                          {checkinInfo.seat_number}
                        </p>
                        <p>
                          <span className="font-medium">Codice Biglietto:</span>{" "}
                          {checkinInfo.ticket_id}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          className={`flex-1 ${buttonVariants.destructive}`}
                          onClick={handleRejectCheckin}
                        >
                          <X className="mr-2 h-4 w-4" />
                          Rifiuta Accesso
                        </Button>
                        <Button
                          className={`flex-1 ${buttonVariants.primary}`}
                          onClick={handleConfirmCheckin}
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Conferma Check-in
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog Nuovo Teatro */}
      <Dialog
        open={showNewTheaterDialog}
        onOpenChange={setShowNewTheaterDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuovo Teatro</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome Teatro</Label>
              <Input
                value={newTheater.name}
                onChange={(e) =>
                  setNewTheater({ ...newTheater, name: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Numero File</Label>
              <Input
                type="number"
                value={newTheater.rows}
                onChange={(e) =>
                  setNewTheater({
                    ...newTheater,
                    rows: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div>
              <Label>Posti per Fila</Label>
              <Input
                type="number"
                value={newTheater.seats_per_row}
                onChange={(e) =>
                  setNewTheater({
                    ...newTheater,
                    seats_per_row: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleCreateTheater}
              className={buttonVariants.primary}
            >
              Crea Teatro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Nuovo Evento */}
      <Dialog open={showNewEventDialog} onOpenChange={setShowNewEventDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuovo Evento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome Evento</Label>
              <Input
                value={newEvent.name}
                onChange={(e) =>
                  setNewEvent({ ...newEvent, name: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Data</Label>
              <Input
                type="date"
                value={newEvent.date}
                onChange={(e) =>
                  setNewEvent({ ...newEvent, date: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Teatro</Label>
              <select
                className="w-full p-2 pr-8 border rounded appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newEvent.theater_id}
                onChange={(e) =>
                  setNewEvent({ ...newEvent, theater_id: e.target.value })
                }
              >
                <option value="">Seleziona un teatro</option>
                {theaters.map((theater) => (
                  <option key={theater.id} value={theater.id}>
                    {theater.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleCreateEvent}
              className={buttonVariants.primary}
            >
              Crea Evento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Modifica Evento */}
      <Dialog open={showEditEventDialog} onOpenChange={setShowEditEventDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifica Evento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome Evento</Label>
              <Input
                value={editingEvent?.name || ""}
                onChange={(e) =>
                  setEditingEvent((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label>Data</Label>
              <Input
                type="date"
                value={editingEvent?.date || ""}
                onChange={(e) =>
                  setEditingEvent((prev) => ({
                    ...prev,
                    date: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label>Teatro</Label>
              <select
                className="w-full p-2 pr-8 border rounded appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={editingEvent?.theater_id || ""}
                onChange={(e) =>
                  setEditingEvent((prev) => ({
                    ...prev,
                    theater_id: e.target.value,
                  }))
                }
              >
                <option value="">Seleziona un teatro</option>
                {theaters.map((theater) => (
                  <option key={theater.id} value={theater.id}>
                    {theater.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleSaveEventEdit}
              className={buttonVariants.primary}
            >
              Salva Modifiche
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Prenotazione Posto */}
      <Dialog open={showSeatDialog} onOpenChange={setShowSeatDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Prenota Posto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input
                value={booking.first_name}
                onChange={(e) =>
                  setBooking({ ...booking, first_name: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Cognome</Label>
              <Input
                value={booking.last_name}
                onChange={(e) =>
                  setBooking({ ...booking, last_name: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Codice Biglietto Cartaceo</Label>
              <Input
                value={booking.ticket_id}
                onChange={(e) =>
                  setBooking({ ...booking, ticket_id: e.target.value })
                }
                placeholder="Inserisci il codice del biglietto cartaceo"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleBookSeat} className={buttonVariants.primary}>
              Conferma Prenotazione
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Gestione Posti Teatro */}
      <Dialog
        open={showTheaterManagementDialog}
        onOpenChange={setShowTheaterManagementDialog}
      >
        <DialogContent className="max-w-[90vw] w-auto max-h-[90vh]">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Gestione Teatro: {selectedTheater?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 overflow-x-auto overflow-y-auto flex-grow">
            <div>
              <Label className="sticky top-0 bg-white py-2">
                Posti Inesistenti
              </Label>
              <div
                className="mt-4 h-full"
                style={{ maxHeight: "calc(80vh - 200px)" }}
              >
                {Array.from({ length: selectedTheater?.rows || 0 }).map(
                  (_, rowIndex) => (
                    <div
                      key={rowIndex}
                      className="flex gap-2 items-center mb-2 whitespace-nowrap"
                    >
                      <span className="w-16 flex-shrink-0">
                        Fila {rowIndex + 1}
                      </span>
                      <div className="flex gap-1 flex-nowrap">
                        {Array.from({
                          length: selectedTheater?.seats_per_row || 0,
                        }).map((_, seatIndex) => {
                          const seatId = `${rowIndex + 1}-${seatIndex + 1}`;
                          const isUnavailable =
                            newTheater.unavailable_seats.includes(seatId);

                          return (
                            <button
                              key={seatId}
                              className={`w-8 h-8 rounded flex-shrink-0 flex items-center justify-center ${
                                isUnavailable
                                  ? "bg-gray-500 text-white"
                                  : "bg-green-500 hover:bg-green-600 text-white"
                              }`}
                              onClick={() => {
                                setNewTheater((prev) => ({
                                  ...prev,
                                  unavailable_seats: isUnavailable
                                    ? prev.unavailable_seats.filter(
                                        (id) => id !== seatId
                                      )
                                    : [...prev.unavailable_seats, seatId],
                                }));
                              }}
                            >
                              <Armchair className="w-6 h-6" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="flex-shrink-0">
            <Button
              onClick={handleSaveUnavailableSeats}
              className={buttonVariants.primary}
            >
              Salva Modifiche
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default App;
