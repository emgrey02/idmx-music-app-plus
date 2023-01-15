import {
	Synth,
	PolySynth,
	Transport,
	Draw,
	Volume,
	Players,
	start,
} from 'tone';
import '../scripts/mousetrap';
import tom from '../assets/drum-samples/tom.wav';
import kick from '../assets/drum-samples/kick.mp3';
import hihat from '../assets/drum-samples/hihat.wav';
import clap from '../assets/drum-samples/clap.wav';

// get html elements
let overlay = document.querySelector('.overlay');
let playButton = document.querySelector('.play-pause-button');
let enterButton = document.querySelector('.overlay__group--button');
let playSvg = document.querySelector('.play');
let pauseSvg = document.querySelector('.pause');
let clearButton = document.querySelector('.clear');
let undoButton = document.querySelector('.undo');
let redoButton = document.querySelector('.redo');
let infoTabButton = document.querySelectorAll('.info-tab-btn');
let noteNames = document.querySelector('.notes');
let drumsNames = document.querySelector('.drum-names');
let trigger = document.querySelector('#trigger');
let dialog = document.querySelector('#dialog');
let close = document.querySelector('#close');
let proButton = document.querySelector('.special');
let body = document.querySelector('body');

//allow user to use keyboard shortcuts while sequencer is selected
Mousetrap.prototype.stopCallback = function (e, element, combo) {
	// if the element has the class "mousetrap" then no need to stop
	if ((' ' + element.className + ' ').indexOf(' mousetrap ') > -1) {
		return false;
	}

	// stop select, and textarea
	return (
		element.tagName == 'SELECT' ||
		element.tagName == 'TEXTAREA' ||
		(element.contentEditable && element.contentEditable == 'true')
	);
};

//dialog functionality
let openDialog = () => {
	dialog.setAttribute('open', '');
	close.focus();
	close.addEventListener('keydown', (e) => {
		if (e.key == 'Tab') {
			e.preventDefault();
		}
	});

	document.querySelector('#cover').style.display = 'block';
	document.addEventListener('keydown', addESC);
};

let closeDialog = () => {
	dialog.removeAttribute('open');
	trigger.focus();
	document.querySelector('#cover').style.display = 'none';
	document.removeEventListener('keydown', addESC);
};

let addESC = (e) => {
	if (e.key == 'Escape') {
		closeDialog();
	}
};

trigger.addEventListener('click', openDialog);
close.addEventListener('click', closeDialog);

//enter/exit pro mode button
proButton.addEventListener('click', () => {
	if (body.classList.length < 1) {
		body.classList.add('pro');
		proButton.textContent = 'Exit Pro Mode';
	} else {
		body.classList.remove('pro');
		proButton.textContent = 'Enter Pro Mode';
	}
});

//set variables
let notes = ['A4', 'G4', 'E4', 'D4', 'C4', 'A3'];
let drumNames = ['hihat', 'clap', 'tom', 'kick'];
let numRows = notes.length;
let totalRows = notes.length + drumNames.length;
let numCols = 16;
let noteInterval = `${numCols}n`;

//enterButton on welcome screen
enterButton.addEventListener('pointerdown', async () => {
	removeOverlay();

	//create context
	await start();
});

enterButton.addEventListener('keydown', async (e) => {
	if (e.code === 'Space' || e.code === 'Enter') {
		removeOverlay();

		//create context
		await start();
	}
});

//playButton stuff
playButton.addEventListener('pointerdown', () => {
	updatePlayState();
});

playButton.addEventListener('keydown', (e) => {
	if (e.code === 'Space' || e.code === 'Enter') {
		updatePlayState();
	}
});

let reflectPlayState = () => {
	if (playButton.dataset.playing === 'false') {
		playSvg.style.display = 'block';
		pauseSvg.style.display = 'none';
	} else {
		playSvg.style.display = 'none';
		pauseSvg.style.display = 'block';
	}
};

// start/stop sound based on play/pause button
let updatePlayState = () => {
	if (playButton.dataset.playing === 'false') {
		playButton.dataset.playing = 'true';
		playButton.ariaChecked = 'true';
		Transport.start('+0.1');
	} else {
		playButton.dataset.playing = 'false';
		playButton.ariaChecked = 'false';
		Transport.stop();
	}
	reflectPlayState();
};

reflectPlayState();

//shortcut
Mousetrap.bind('shift+p', updatePlayState);

//called when enter button on welcome screen is pressed
function removeOverlay() {
	overlay.classList.add('hide');
	setTimeout(() => {
		overlay.style.display = 'none';
	}, 500);
}

//info tab functionality
infoTabButton.forEach((tab) =>
	tab.addEventListener('pointerdown', (e) => {
		if (tab.classList[1] == 'synth') {
			if (noteNames.className == 'notes show') {
				noteNames.classList.remove('show');
			} else {
				noteNames.classList.add('show');
			}
		}

		if (tab.classList[1] == 'drum') {
			if (drumsNames.className == 'drum-names show') {
				drumsNames.classList.remove('show');
			} else {
				drumsNames.classList.add('show');
			}
		}
	})
);

infoTabButton.forEach((tab) =>
	tab.addEventListener('keydown', (e) => {
		if (e.code == 'Space' || e.code == 'Enter') {
			if (tab.classList[1] == 'synth') {
				if (noteNames.className == 'notes show') {
					noteNames.classList.remove('show');
				} else {
					noteNames.classList.add('show');
				}
			}

			if (tab.classList[1] == 'drum') {
				if (drumsNames.className == 'drum-names show') {
					drumsNames.classList.remove('show');
				} else {
					drumsNames.classList.add('show');
				}
			}
		}
	})
);

//music time!
// create synth - poly synth bc we want polyphony
let polySynth = new PolySynth(Synth).toDestination();

// get synth sequencer
let cells = [];
for (let i = 0; i < numCols; i++) {
	let currentCol = document.querySelectorAll(
		`.sequencer__column:nth-child(${i + 1}) .cell`
	);
	cells.push(Array.from(currentCol));
}

// get separate drum sequencer
let drumCells = [];
for (let i = 0; i < numCols; i++) {
	let currentCol = document.querySelectorAll(
		`.drum-seq__column:nth-child(${i + 1}) .cell`
	);
	drumCells.push(Array.from(currentCol));
}

//make array of every cell - good to have
let allCells = cells.concat(drumCells).flat();

//make array of cell click history
let cellHistory = [];

//make array of undo history
let undoHistory = [];

//play sound when cell is clicked (if its unchecked and sequencer isn't playing)
cells.forEach((column) => {
	column.forEach((cell) =>
		cell.addEventListener('pointerdown', (e) => {
			cellHistory.push(e.target);
			if (playButton.dataset.playing != 'true') {
				if (!e.target.checked) {
					let noteIndex = e.target.classList[1].slice(4) - 1;
					polySynth.triggerAttackRelease(notes[noteIndex], '32n');
				}
			}
		})
	);

	column.forEach((cell) =>
		cell.addEventListener('keydown', (e) => {
			if (e.code == 'Space') {
				cellHistory.push(e.target);
				if (playButton.dataset.playing != 'true') {
					if (!e.target.checked) {
						let noteIndex = e.target.classList[1].slice(4) - 1;
						polySynth.triggerAttackRelease(notes[noteIndex], '32n');
					}
				}
			}
		})
	);
});

drumCells.forEach((column) => {
	column.forEach((cell) =>
		cell.addEventListener('pointerdown', (e) => {
			cellHistory.push(e.target);
			if (playButton.dataset.playing != 'true') {
				if (!e.target.checked) {
					let noteIndex = e.target.classList[1].slice(4) - 1;
					let currentSample = drumSamples.player(
						drumNames[noteIndex]
					);
					currentSample.start(0, 0, '16n');
				}
			}
		})
	);
	column.forEach((cell) =>
		cell.addEventListener('keydown', (e) => {
			if (e.code == 'Space') {
				cellHistory.push(e.target);
				if (playButton.dataset.playing != 'true') {
					if (!e.target.checked) {
						let noteIndex = e.target.classList[1].slice(4) - 1;
						let currentSample = drumSamples.player(
							drumNames[noteIndex]
						);
						currentSample.start(0, 0, '16n');
					}
				}
			}
		})
	);
});

// create players for our drum sounds
const drumSamples = new Players({
	urls: {
		hihat: hihat,
		clap: clap,
		tom: tom,
		kick: kick,
	},
	onload: () => {
		console.log('loaded');
	},
	onerror: (error) => console.log(error),
}).toDestination();

// callback function for Tone.Transport.scheduleRepeat
// occurs in 16th note interval
//index corresponds to columns, i corresponds to sounds
let index = 0;
let repeat = (time) => {
	Draw.schedule(() => {
		for (let i = 0; i < numRows; i++) {
			//set variables
			let currentNote = notes[i];
			let currentColumn = cells[index].concat(drumCells[index]);
			let synthCol = cells[index];
			let drumCol = drumCells[index];
			let previousColumn =
				index === 0
					? cells[numCols - 1].concat(drumCells[numCols - 1])
					: cells[index - 1].concat(drumCells[index - 1]);

			//signal that the column is being played
			currentColumn.forEach((cell) => {
				cell.classList.add('my-turn');
			});
			previousColumn.forEach((cell) => {
				cell.classList.remove('my-turn');
			});

			//play the correct sound
			if (synthCol[i].checked) {
				polySynth.triggerAttackRelease(currentNote, '32n', time);
			}
			if (drumCol[i]?.checked) {
				let currentSample = drumSamples.player(drumNames[i]);
				currentSample.start(0, 0, '16n');
			}
		}
		//next column
		index++;
		index = index % 16;
	}, time);
};
Transport.scheduleRepeat(repeat, noteInterval);

//place to copy cell states so we can undo clear
let cellStates = [];

//clear button
let clearSequencer = () => {
	for (let i = 0; i < allCells.length; i++) {
		cellStates.push(allCells[i].checked);
		allCells[i].checked = false;
	}
};

clearButton.addEventListener('pointerdown', clearSequencer);
clearButton.addEventListener('keydown', (e) => {
	if (e.code === 'Space' || e.code === 'Enter') {
		clearSequencer();
	}
});

//shortcut
Mousetrap.bind('shift+c', clearSequencer);

//undo button
let undo = () => {
	if (cellStates.length > 0) {
		for (let i = 0; i < allCells.length; i++) {
			allCells[i].checked = cellStates[i];
		}
		cellStates = [];
	} else if (cellHistory.length >= 1) {
		cellHistory[cellHistory.length - 1].checked =
			!cellHistory[cellHistory.length - 1].checked;
		undoHistory.push(cellHistory.pop());
	}
};

undoButton.addEventListener('pointerdown', undo);
undoButton.addEventListener('keydown', (e) => {
	if (e.code === 'Space' || e.code === 'Enter') {
		undo();
	}
});

//shortcut
Mousetrap.bind('shift+z', undo);

//redo button
let redo = () => {
	if (undoHistory.length >= 1) {
		undoHistory[undoHistory.length - 1].checked =
			!undoHistory[undoHistory.length - 1].checked;
		cellHistory.push(undoHistory.pop());
	}
};

redoButton.addEventListener('pointerdown', redo);
redoButton.addEventListener('keydown', (e) => {
	if (e.code === 'Space' || e.code === 'Enter') {
		redo();
	}
});

//shortcut
Mousetrap.bind('shift+r', redo);

// TODO: normalize sounds
// * normalize sounds (to account for different volumes)
//let norm = new Tone.Normalize(2, 4);
//polySynth.connect(norm);
//drumSamples.connect(norm);

//get ui for volume control
let volSlider = document.querySelector('#volume');
let volume = new Volume(-Infinity).toDestination();
polySynth.connect(volume);
drumSamples.connect(volume);
polySynth.volume.value = volSlider.value;
drumSamples.volume.value = volSlider.value;
volSlider.addEventListener('input', () => {
	polySynth.volume.value = volSlider.value;
	drumSamples.volume.value = volSlider.value;
});

//shortcut
Mousetrap.bind('shift+v', () => {
	volSlider.focus();
});

//get ui for bpm control
let tempoSlider = document.querySelector('#tempo');
Transport.bpm.value = tempoSlider.value;
tempoSlider.addEventListener('input', () => {
	Transport.bpm.value = tempoSlider.value;
});

//shortcut
Mousetrap.bind('shift+t', () => {
	tempoSlider.focus();
});

// get ui to choose oscillator
let chooseWaveform = document.querySelector('#synth-ctrl');
let waveformOptions = chooseWaveform.querySelectorAll('input');
waveformOptions.forEach((rButton) => {
	rButton.addEventListener('input', (e) => {
		if (e.target.checked) {
			polySynth.set({
				oscillator: {
					type: e.target.value,
				},
			});
		}
	});
});

//shortcut
Mousetrap.bind('shift+w', () => {
	document.querySelector('#sinewave').focus();
});

// * pro mode time
