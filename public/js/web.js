//


const socket = io.connect('http://localhost:3000');

socket.on('games_list', function (data) {
    $('#gameTable').html('');
    $(Object.keys(data.games)).each(function (i, ob) {
        $('#gameTable').append(`<li><a href="/${data.games[ob].gameName}">${data.games[ob].gameName}</a></li>`)
    })
});

$('#new_room').click(function (e) {
    console.log('click');
    socket.emit('new_room')
});