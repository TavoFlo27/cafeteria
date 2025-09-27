document.addEventListener('DOMContentLoaded', () => {
    // Actualizar automáticamente cada 10 segundos
    setInterval(() => {
        window.location.reload();
    }, 10000);

    // Marcar como pagado
    document.querySelector('.btn-marcar-pagado')?.addEventListener('click', () => {
        const pedidoId = prompt("Ingrese el número de pedido a marcar como pagado:");
        if (pedidoId) {
            fetch(`/actualizar_estado/${pedidoId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `estado=pagado`
            })
            .then(response => {
                if (response.ok) {
                    alert(`Pedido #${pedidoId} marcado como pagado`);
                    window.location.reload();
                } else {
                    alert('Error al actualizar el estado');
                }
            });
        }
    });

    // Imprimir ticket
    document.querySelector('.btn-imprimir')?.addEventListener('click', () => {
        const pedidoId = prompt("Ingrese el número de pedido a imprimir:");
        if (pedidoId) {
            window.open(`/seguimiento/${pedidoId}`, '_blank');
        }
    });
});