import React from 'react';

export default function UserNotRegisteredError() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background text-foreground">
      <div className="max-w-md text-center space-y-3">
        <h1 className="text-2xl font-semibold">Usuário não registrado</h1>
        <p className="text-muted-foreground">
          Sua conta foi autenticada, mas ainda não está registrada neste aplicativo.
        </p>
      </div>
    </div>
  );
}
